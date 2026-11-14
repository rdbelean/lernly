#!/usr/bin/env python3
"""Build the Lernly trainer: validated course JSON -> one offline HTML file.

Claude only writes content (kurs.json, themen/*.json, ...). This script puts
it into the fixed trainer template, so the interface never has to be
written again. The course data travels inside the HTML file, so the file is
also the backup: --unpack restores the _lernly folder from it.

Usage:
  python3 build_trainer.py <_lernly-folder> [--out <file.html>]
  python3 build_trainer.py --unpack <Lernly-Trainer.html> --to <_lernly-folder>
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.dont_write_bytecode = True  # keep plugin and course folders free of __pycache__
sys.path.insert(0, str(HERE))
from validate import validate_dir  # noqa: E402

TEMPLATE = HERE.parent / "assets" / "trainer.html"
VERSION = "0.1.0"
DATA_RE = re.compile(r'(<script type="application/json" id="lernly-data">)(.*?)(</script>)', re.S)


def default_out(d: Path) -> Path:
    base = d.parent if d.name == "_lernly" else d
    return base / "Lernly-Trainer.html"


def build(d: Path, out: Path, template: Path) -> int:
    rep, data = validate_dir(d)
    for wmsg in rep.warnings:
        print("HINWEIS  " + wmsg)
    if rep.errors:
        for e in rep.errors:
            print("FEHLER   " + e)
        print(f"\nNicht gebaut: {len(rep.errors)} Fehler. Erst die betroffenen Dateien korrigieren.")
        return 1
    data["meta"] = {"builtAt": dt.datetime.now().isoformat(timespec="minutes"),
                    "generator": f"lernly-plugin {VERSION}"}
    payload = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    # Never let content close the script tag or open an HTML comment.
    payload = payload.replace("</", "<\\/").replace("<!--", "<\\u0021--")
    html = template.read_text(encoding="utf-8")
    if "__LERNLY_DATA__" not in html:
        print(f"Vorlage ohne Platzhalter: {template}", file=sys.stderr)
        return 1
    title = (data["course"].get("title") or "Kurs").replace("<", "").replace(">", "")
    html = html.replace("__LERNLY_TITLE__", f"{title} · Lernly Trainer")
    html = html.replace("__LERNLY_DATA__", payload)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(html, encoding="utf-8")
    n_topics = len(data["topics"])
    n_tasks = sum(len(t.get("tasks", [])) for t in data["topics"].values())
    n_cards = sum(len(t.get("cards", [])) for t in data["topics"].values())
    print(f"\nTrainer gebaut: {out}")
    print(f"{n_topics} Themen · {n_tasks} Aufgaben · {n_cards} Karten · "
          f"{len(data['mocks'])} Probeklausuren · {out.stat().st_size // 1024} KB")
    return 0


def unpack(html_path: Path, to: Path) -> int:
    html = html_path.read_text(encoding="utf-8")
    m = DATA_RE.search(html)
    if not m:
        print("Keine Lernly-Daten in dieser Datei gefunden.", file=sys.stderr)
        return 1
    data = json.loads(m.group(2))
    to.mkdir(parents=True, exist_ok=True)
    (to / "themen").mkdir(exist_ok=True)

    def dump(p: Path, obj) -> None:
        p.write_text(json.dumps(obj, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")

    dump(to / "kurs.json", data["course"])
    for tid, th in data.get("topics", {}).items():
        dump(to / "themen" / f"{tid}.json", th)
    if data.get("mocks"):
        (to / "probeklausuren").mkdir(exist_ok=True)
        for m_ in data["mocks"]:
            dump(to / "probeklausuren" / f"{m_['id']}.json", m_)
    if data.get("cheatsheet"):
        dump(to / "spickzettel.json", data["cheatsheet"])
    print(f"Entpackt nach {to}: {len(data.get('topics', {}))} Themen, "
          f"{len(data.get('mocks', []))} Probeklausuren")
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description="Lernly: Trainer bauen")
    ap.add_argument("folder", nargs="?", default="_lernly")
    ap.add_argument("--out", help="Ziel-HTML (Standard: Lernly-Trainer.html neben _lernly)")
    ap.add_argument("--template", default=str(TEMPLATE))
    ap.add_argument("--unpack", help="Trainer-HTML, aus der die Kursdateien wiederhergestellt werden")
    ap.add_argument("--to", help="Zielordner für --unpack (Standard: ./_lernly)")
    args = ap.parse_args()
    if args.unpack:
        return unpack(Path(args.unpack).expanduser(), Path(args.to or "_lernly").expanduser())
    d = Path(args.folder).expanduser().resolve()
    out = Path(args.out).expanduser().resolve() if args.out else default_out(d)
    return build(d, out, Path(args.template))


if __name__ == "__main__":
    sys.exit(main())
