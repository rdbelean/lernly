"""Restricted operations for the Node MCP host; only Python stdlib is required."""
import ast
import contextlib
import io
import json
import math
import operator
import sys
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

sys.dont_write_bytecode = True
engine = Path(sys.argv[1])
sys.path.insert(0, str(engine / 'skills/lernly-trainer-bauen/scripts'))
sys.path.insert(0, str(engine / 'skills/lernly-kurs-einrichten/scripts'))


def validate(files):
    import validate as v
    report = v.Report()
    info = v.check_kurs(files.get('kurs.json'), report)
    ids = set()
    for name, data in files.items():
        if name.startswith('themen/'):
            v.check_thema(name, data, info, ids, report)
        elif name.startswith('probeklausuren/'):
            v.check_mock(name, data, info, report)
        elif name == 'spickzettel.json':
            v.check_cheat(data, info, report)
    missing = sorted(info['topics'] - {Path(n).stem for n in files if n.startswith('themen/')})
    return {'errors': report.errors, 'warnings': report.warnings, 'missing_topics': missing}


def calculate(expression):
    # Deliberately no eval, attributes, names, indexing or calls.
    ops = {ast.Add: operator.add, ast.Sub: operator.sub, ast.Mult: operator.mul,
           ast.Div: operator.truediv, ast.Pow: operator.pow, ast.Mod: operator.mod}
    def walk(node):
        if isinstance(node, ast.Constant) and type(node.value) in (float, int):
            result = float(node.value)
        elif isinstance(node, ast.UnaryOp) and isinstance(node.op, (ast.USub, ast.UAdd)):
            result = walk(node.operand) * (-1 if isinstance(node.op, ast.USub) else 1)
        elif isinstance(node, ast.BinOp) and type(node.op) in ops:
            left, right = walk(node.left), walk(node.right)
            if isinstance(node.op, ast.Pow) and abs(right) > 1000:
                raise ValueError('Exponent außerhalb des erlaubten Bereichs.')
            result = ops[type(node.op)](left, right)
        else:
            raise ValueError('Nur Zahlen, Klammern und + - * / ** % sind erlaubt.')
        if isinstance(result, complex) or not math.isfinite(result) or abs(result) > 1e100:
            raise ValueError('Ergebnis außerhalb des erlaubten Bereichs.')
        return result
    return {'expression': expression, 'result': walk(ast.parse(expression, mode='eval').body)}


def extract_office(filename):
    from extract_text import pptx_pages, docx_pages
    file = Path(filename)
    # Bound decompressed XML size before any library reads it.
    with zipfile.ZipFile(file) as archive:
        if sum(x.file_size for x in archive.infolist()) > 150_000_000:
            raise ValueError('Entpackte Office-Datei über 150 MB. Bitte aufteilen.')
        if any(x.file_size > 30_000_000 for x in archive.infolist()):
            raise ValueError('Ein Office-Bestandteil ist größer als 30 MB.')
        if file.suffix.lower() == '.xlsx':
            ns = {'s': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
            strings = []
            if 'xl/sharedStrings.xml' in archive.namelist():
                strings = [''.join(el.itertext()) for el in ET.fromstring(archive.read('xl/sharedStrings.xml'))]
            relationships = {r.get('Id'): r.get('Target') for r in ET.fromstring(archive.read('xl/_rels/workbook.xml.rels'))}
            pages, missing = [], 0
            for sheet in ET.fromstring(archive.read('xl/workbook.xml')).findall('s:sheets/s:sheet', ns):
                rid = sheet.get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id')
                target = relationships[rid]
                member = target.lstrip('/') if target.startswith('/') else 'xl/' + target
                rows = []
                for row in ET.fromstring(archive.read(member)).findall('.//s:row', ns):
                    values = []
                    for cell in row.findall('s:c', ns):
                        v, f = cell.find('s:v', ns), cell.find('s:f', ns)
                        value = v.text if v is not None and v.text else ''
                        if cell.get('t') == 's' and value: value = strings[int(value)]
                        if cell.get('t') == 'inlineStr': value = ''.join(cell.find('s:is', ns).itertext())
                        if f is not None:
                            if not value: missing += 1
                            value = f'Formel: ={f.text or "[shared formula]"}; gespeicherter Wert: {value or "FEHLT"}'
                        values.append(f'{cell.get("r")}: {value}')
                    rows.append(' | '.join(values))
                pages.append({'label': 'Blatt ' + sheet.get('name', ''), 'text': '\n'.join(rows)})
            return {'pages': pages, 'warnings': [f'{missing} Formeln ohne gespeicherten Wert. Keine Neuberechnung; Excel-Charts/Bilder werden nicht gelesen.']}
    raw = pptx_pages(file) if file.suffix.lower() == '.pptx' else docx_pages(file)
    unit = 'Folie' if file.suffix.lower() == '.pptx' else 'Textabschnitt'
    return {'pages': [{'label': f'{unit} {i}', 'text': t} for i, t in enumerate(raw, 1)],
            'warnings': ['Bilder werden nicht gelesen. DOCX-Abschnitte sind keine verlässlichen gedruckten Seitenzahlen.']}


try:
    request = json.load(sys.stdin)
    with contextlib.redirect_stdout(io.StringIO()) as output:
        op = request['op']
        if op == 'validate': result = validate(request['files'])
        elif op == 'calculate': result = calculate(request['expression'])
        elif op == 'extract': result = extract_office(request['file'])
        elif op == 'build':
            from build_trainer import build, TEMPLATE
            result = {'exit_code': build(Path(request['folder']), Path(request['out']), TEMPLATE)}
        elif op == 'export':
            from export_cards import main
            sys.argv = ['export_cards.py', request['folder'], '--out', request['out'], '--format', request['format']]
            result = {'exit_code': main()}
        else: raise ValueError('Unbekannte Operation')
    if output.getvalue(): result['log'] = output.getvalue()
    print(json.dumps(result, ensure_ascii=False, allow_nan=False))
except Exception as exc:
    print(json.dumps({'error': f'{type(exc).__name__}: {exc}'}, ensure_ascii=False))
    sys.exit(1)
