#!/usr/bin/env python3
"""Export Lernly flashcards for Anki or Quizlet.

Anki: tab-separated text file with Anki header lines (File > Import),
deck "Lernly::<course>", one tag per topic. Formulas stay as \\( \\) and
\\[ \\], which Anki renders with its built-in MathJax.
Quizlet: "term<TAB>definition" per line for "Import" (choose Tab and
New line as separators). Quizlet does not render LaTeX.

Usage:
  python3 export_cards.py <_lernly-folder> [--format anki|quizlet|both] [--out <dir>]
"""
from __future__ import annotations

import argparse
import html
import json
import re
import sys
from pathlib import Path


def md_to_html(s: str) -> str:
    """Tiny Markdown-light -> HTML for Anki (keeps LaTeX untouched)."""
    s = html.escape(s, quote=False)
    s = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", s)
    s = re.sub(r"==(.+?)==", r"<b>\1</b>", s)
    s = re.sub(r"(?<![\w*])\*(?!\s)(.+?)(?<!\s)\*(?![\w*])", r"<i>\1</i>", s)
    lines, out, in_list = s.split("\n"), [], False
    for ln in lines:
        m = re.match(r"^\s*(?:[-*]|\d+\.)\s+(.*)", ln)
        if m:
            if not in_list:
                out.append("<ul>")
                in_list = True
            out.append(f"<li>{m.group(1)}</li>")
        else:
            if in_list:
                out.append("</ul>")
                in_list = False
            out.append(ln + "<br>")
    if in_list:
        out.append("</ul>")
    res = "".join(out)
    res = re.sub(r"(<br>)+$", "", res)
    return res.replace("\t", " ")


def md_to_plain(s: str) -> str:
    s = re.sub(r"\*\*(.+?)\*\*|==(.+?)==", lambda m: m.group(1) or m.group(2), s)
    s = re.sub(r"\s*\n\s*", " / ", s.strip())
    return s.replace("\t", " ")


def tag(s: str) -> str:
    return re.sub(r"[^\w-]+", "_", s, flags=re.U).strip("_")[:40] or "thema"


def main() -> int:
    ap = argparse.ArgumentParser(description="Lernly: Karten für Anki/Quizlet exportieren")
    ap.add_argument("folder", nargs="?", default="_lernly")
    ap.add_argument("--format", choices=["anki", "quizlet", "both"], default="both")
    ap.add_argument("--out", help="Zielordner (Standard: <_lernly>/export)")
    args = ap.parse_args()
    d = Path(args.folder).expanduser().resolve()
    kurs = json.loads((d / "kurs.json").read_text(encoding="utf-8"))
    titles = {t["id"]: t["title"] for t in kurs.get("topics", [])}
    order = [t["id"] for t in sorted(kurs.get("topics", []),
                                     key=lambda t: (t.get("tier", 3), -t.get("expectedPoints", 0)))]
    cards = []
    for tid in order:
        f = d / "themen" / f"{tid}.json"
        if not f.exists():
            continue
        th = json.loads(f.read_text(encoding="utf-8"))
        for c in th.get("cards", []):
            cards.append((tid, c))
    if not cards:
        print("Keine Karten gefunden.")
        return 1
    out = Path(args.out).expanduser().resolve() if args.out else d / "export"
    out.mkdir(parents=True, exist_ok=True)
    course = kurs.get("title", "Kurs")
    written = []
    if args.format in ("anki", "both"):
        deck = "Lernly::" + course.replace("::", " ").replace("\n", " ")
        rows = ["#separator:tab", "#html:true", f"#deck:{deck}", "#tags column:3",
                "#notetype:Basic"]
        for tid, c in cards:
            rows.append("\t".join([md_to_html(c["front"]), md_to_html(c["back"]),
                                   "lernly " + tag(titles.get(tid, tid))]))
        p = out / f"{tag(course)}_anki.txt"
        p.write_text("\n".join(rows) + "\n", encoding="utf-8")
        written.append(f"Anki:    {p}  (Anki → Datei → Importieren)")
    if args.format in ("quizlet", "both"):
        rows = [f"{md_to_plain(c['front'])}\t{md_to_plain(c['back'])}" for _, c in cards]
        p = out / f"{tag(course)}_quizlet.txt"
        p.write_text("\n".join(rows) + "\n", encoding="utf-8")
        written.append(f"Quizlet: {p}  (Set erstellen → Importieren, Trennung: Tab / Neue Zeile)")
    print(f"{len(cards)} Karten exportiert:")
    print("\n".join(written))
    if any("\\(" in c["front"] + c["back"] or "\\[" in c["front"] + c["back"] for _, c in cards):
        print("Hinweis: Quizlet zeigt Formeln als LaTeX-Text, Anki rendert sie.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
