#!/usr/bin/env python3
"""Extract text from course files, page by page, for Lernly.

Writes one .txt per source file with "=== Seite N ===" markers, so Claude
reads cheap text instead of whole PDFs and can cite page numbers. Lists
pages with little text (likely diagrams) so Claude can look at only those
as images.

Backends: PDF via pdftotext (poppler) if present, else pypdf, pdfplumber
or PyMuPDF. PPTX and DOCX use the standard library only.

Usage:
  python3 extract_text.py <course-folder> [--out <dir>] [--only <file> ...]
                          [--force] [--min-chars 60]
Default output: <course-folder>/_lernly/text/
Already extracted files are skipped unless the source is newer (or --force).
"""
from __future__ import annotations

import argparse
import logging
import os
import re
import shutil
import subprocess
import sys
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

# pypdf logs harmless warnings for slightly broken PDFs; keep output readable.
logging.getLogger("pypdf").setLevel(logging.ERROR)

SKIP_DIRS = {"_lernly", ".git", "node_modules", "__MACOSX", ".Trash"}
SKIP_DIR_PREFIXES = ("_Text", ".")
SKIP_PREFIXES = ("~$", "._", "00_LERNLY", "Lernly-Trainer")
SUPPORTED = {".pdf", ".pptx", ".docx", ".txt", ".md"}

NS = {
    "a": "http://schemas.openxmlformats.org/drawingml/2006/main",
    "p": "http://schemas.openxmlformats.org/presentationml/2006/main",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
    "w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
    "rel": "http://schemas.openxmlformats.org/package/2006/relationships",
}


class ExtractError(Exception):
    pass


# ---------------------------------------------------------------- PDF

def pdf_backend() -> str | None:
    if shutil.which("pdftotext"):
        return "pdftotext"
    for mod in ("pypdf", "pdfplumber", "fitz"):
        try:
            __import__(mod)
            return mod
        except ImportError:
            continue
    return None


def pdf_pages(path: Path, backend: str) -> list[str]:
    if backend == "pdftotext":
        res = subprocess.run(["pdftotext", "-layout", "-enc", "UTF-8", str(path), "-"],
                             capture_output=True, timeout=600)
        if res.returncode != 0:
            raise ExtractError(res.stderr.decode("utf-8", "replace").strip()[:200])
        pages = res.stdout.decode("utf-8", "replace").split("\f")
        if pages and not pages[-1].strip():
            pages = pages[:-1]
        return pages
    if backend == "pypdf":
        import pypdf  # type: ignore
        reader = pypdf.PdfReader(str(path), strict=False)
        out = []
        for page in reader.pages:
            try:
                out.append(page.extract_text() or "")
            except Exception:
                out.append("")
        return out
    if backend == "pdfplumber":
        import pdfplumber  # type: ignore
        with pdfplumber.open(str(path)) as pdf:
            return [(p.extract_text() or "") for p in pdf.pages]
    if backend == "fitz":
        import fitz  # type: ignore
        with fitz.open(str(path)) as doc:
            return [p.get_text() for p in doc]
    raise ExtractError("kein PDF-Werkzeug verfügbar")


# ---------------------------------------------------------------- PPTX

def _xml(z: zipfile.ZipFile, name: str) -> ET.Element | None:
    try:
        return ET.fromstring(z.read(name))
    except KeyError:
        return None


def _paragraphs(root: ET.Element) -> list[str]:
    lines = []
    for para in root.iter(f"{{{NS['a']}}}p"):
        text = "".join(t.text or "" for t in para.iter(f"{{{NS['a']}}}t"))
        if text.strip():
            lines.append(text.strip())
    return lines


def _rels(z: zipfile.ZipFile, name: str) -> dict[str, tuple[str, str]]:
    root = _xml(z, name)
    if root is None:
        return {}
    return {r.get("Id"): (r.get("Type", ""), r.get("Target", ""))
            for r in root.iter(f"{{{NS['rel']}}}Relationship")}


def _join(base_dir: str, target: str) -> str:
    return os.path.normpath(os.path.join(base_dir, target)).replace("\\", "/")


def pptx_pages(path: Path) -> list[str]:
    with zipfile.ZipFile(path) as z:
        names = set(z.namelist())
        slides: list[str] = []
        pres = _xml(z, "ppt/presentation.xml")
        prels = _rels(z, "ppt/_rels/presentation.xml.rels")
        if pres is not None:
            for sid in pres.iter(f"{{{NS['p']}}}sldId"):
                rid = sid.get(f"{{{NS['r']}}}id")
                if rid in prels:
                    slides.append(_join("ppt", prels[rid][1]))
        if not slides:
            slides = sorted((n for n in names if re.fullmatch(r"ppt/slides/slide\d+\.xml", n)),
                            key=lambda n: int(re.search(r"(\d+)", n.rsplit("/", 1)[1]).group(1)))
        pages = []
        for s in slides:
            root = _xml(z, s)
            text = "\n".join(_paragraphs(root)) if root is not None else ""
            rel_name = s.replace("ppt/slides/", "ppt/slides/_rels/") + ".rels"
            for typ, target in _rels(z, rel_name).values():
                if typ.endswith("/notesSlide"):
                    nroot = _xml(z, _join("ppt/slides", target))
                    if nroot is not None:
                        notes = [ln for ln in _paragraphs(nroot) if not ln.isdigit()]
                        if notes:
                            text += "\n[Notizen] " + " ".join(notes)
            pages.append(text)
        return pages


# ---------------------------------------------------------------- DOCX

def docx_pages(path: Path) -> list[str]:
    with zipfile.ZipFile(path) as z:
        root = _xml(z, "word/document.xml")
    if root is None:
        raise ExtractError("word/document.xml fehlt")
    w = NS["w"]
    pages, cur = [], []
    for para in root.iter(f"{{{w}}}p"):
        buf = []
        for el in para.iter():
            tag = el.tag.rsplit("}", 1)[-1]
            if tag == "t" and el.text:
                buf.append(el.text)
            elif tag == "tab":
                buf.append("\t")
            elif tag == "br" and el.get(f"{{{w}}}type") == "page":
                cur.append("".join(buf))
                buf = []
                pages.append("\n".join(cur))
                cur = []
            elif tag == "lastRenderedPageBreak" and (cur or buf):
                cur.append("".join(buf))
                buf = []
                pages.append("\n".join(cur))
                cur = []
        line = "".join(buf).strip()
        if line:
            cur.append(line)
    if cur:
        pages.append("\n".join(cur))
    return pages or [""]


# ---------------------------------------------------------------- main

def clean(text: str) -> str:
    text = text.replace("\x00", "")
    text = re.sub(r"[ \t]+\n", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def iter_files(root: Path, only: list[str] | None):
    if only:
        for o in only:
            p = (root / o) if not Path(o).is_absolute() else Path(o)
            if p.is_file():
                yield p
            else:
                print(f"Nicht gefunden: {o}", file=sys.stderr)
        return
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = sorted(d for d in dirnames
                             if d not in SKIP_DIRS and not d.startswith(SKIP_DIR_PREFIXES))
        for fn in sorted(filenames):
            if fn.startswith(SKIP_PREFIXES):
                continue
            p = Path(dirpath) / fn
            if p.suffix.lower() in SUPPORTED:
                yield p


def main() -> int:
    ap = argparse.ArgumentParser(description="Lernly: Text aus Kursdateien ziehen")
    ap.add_argument("folder", nargs="?", default=".")
    ap.add_argument("--out", help="Zielordner (Standard: <Ordner>/_lernly/text)")
    ap.add_argument("--only", nargs="+", help="nur diese Dateien (relativ zum Kursordner)")
    ap.add_argument("--force", action="store_true", help="auch aktuelle Dateien neu extrahieren")
    ap.add_argument("--min-chars", type=int, default=60,
                    help="Seiten mit weniger Zeichen gelten als 'wenig Text' (Grafik)")
    args = ap.parse_args()

    root = Path(args.folder).expanduser().resolve()
    if not root.is_dir():
        print(f"Ordner nicht gefunden: {root}", file=sys.stderr)
        return 1
    out_dir = Path(args.out).expanduser().resolve() if args.out else root / "_lernly" / "text"
    out_dir.mkdir(parents=True, exist_ok=True)
    backend = pdf_backend()

    rows, errors, skipped = [], [], 0
    for src in iter_files(root, args.only):
        try:
            rel = str(src.relative_to(root))
        except ValueError:
            rel = src.name
        dest = out_dir / (rel + ".txt")
        if dest.exists() and not args.force and dest.stat().st_mtime >= src.stat().st_mtime:
            skipped += 1
            continue
        ext = src.suffix.lower()
        try:
            if ext == ".pdf":
                if backend is None:
                    raise ExtractError("kein PDF-Werkzeug: 'pip install pypdf' oder poppler installieren")
                pages, unit = pdf_pages(src, backend), "Seite"
            elif ext == ".pptx":
                pages, unit = pptx_pages(src), "Folie"
            elif ext == ".docx":
                pages, unit = docx_pages(src), "Seite"
            else:
                pages, unit = [src.read_text(encoding="utf-8", errors="replace")], "Seite"
        except (ExtractError, zipfile.BadZipFile, ET.ParseError, OSError,
                subprocess.TimeoutExpired) as e:
            errors.append((rel, str(e)))
            continue
        except Exception as e:  # keep going on unexpected parser errors
            msg = f"{type(e).__name__}: {e}"
            if "AES" in msg or "decrypt" in msg.lower() or "encrypt" in msg.lower():
                msg = "verschlüsselte PDF – im Browser öffnen, als neue PDF drucken und erneut extrahieren"
            errors.append((rel, msg))
            continue

        pages = [clean(p) for p in pages]
        low = [i + 1 for i, p in enumerate(pages) if len(p) < args.min_chars]
        body = [f"# {rel}", f"# {len(pages)} {unit}n · extrahiert für Lernly", ""]
        for i, p in enumerate(pages, 1):
            body.append(f"=== {unit} {i} ===")
            body.append(p if p else "[kein Text – evtl. Grafik oder Scan]")
            body.append("")
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_text("\n".join(body), encoding="utf-8")
        chars = sum(len(p) for p in pages)
        rows.append((rel, len(pages), chars, low))

    # Summary (stdout + _uebersicht.md)
    lines = [f"# Text-Extraktion: {root.name}", "",
             f"PDF-Werkzeug: {backend or 'keins'} · neu extrahiert: {len(rows)} · "
             f"unverändert übersprungen: {skipped} · Fehler: {len(errors)}", ""]
    if rows:
        total_chars = sum(r[2] for r in rows)
        lines.append(f"Neu extrahiert ca. {total_chars:,} Zeichen ≈ {total_chars // 4:,} Tokens.".replace(",", "."))
        lines += ["", "| Datei | Seiten | Zeichen | ≈ Tokens | Seiten mit wenig Text (Grafik/Scan?) |",
                  "|---|---|---|---|---|"]
        for rel, n, chars, low in rows:
            lowtxt = ", ".join(map(str, low[:20])) + (f" … (+{len(low) - 20})" if len(low) > 20 else "")
            if n and len(low) / n > 0.6:
                lowtxt = f"fast alle ({len(low)}/{n}) – Scan? Seiten als Bild ansehen"
            lines.append(f"| {rel.replace('|', '/')} | {n} | {chars} | {chars // 4} | {lowtxt} |")
    if errors:
        lines += ["", "Fehler:"] + [f"- {rel}: {msg}" for rel, msg in errors]
    lines += ["", f"Textdateien liegen in: {out_dir}"]
    summary = "\n".join(lines) + "\n"
    (out_dir / "_uebersicht.md").write_text(summary, encoding="utf-8")
    print(summary)
    return 0 if not errors or rows else 2


if __name__ == "__main__":
    sys.exit(main())
