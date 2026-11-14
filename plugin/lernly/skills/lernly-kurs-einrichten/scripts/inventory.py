#!/usr/bin/env python3
"""Inventory of a course folder for Lernly.

Lists every course file with type, size, page count and a guessed role
(old exam, exercise, slides, script, other). Standard library only; uses
pypdf for PDF page counts when it is installed.

Usage:
  python3 inventory.py <course-folder> [--out <file.md>] [--json]
"""
from __future__ import annotations

import argparse
import json
import logging
import os
import re
import sys
import zipfile
from pathlib import Path

# pypdf logs harmless warnings for slightly broken PDFs; keep output readable.
logging.getLogger("pypdf").setLevel(logging.ERROR)

SKIP_DIRS = {"_lernly", ".git", "node_modules", "__MACOSX", ".Trash"}
SKIP_DIR_PREFIXES = ("_Text", ".")
SKIP_FILES = {".DS_Store", "Thumbs.db", "desktop.ini"}
SKIP_PREFIXES = ("~$", "._", "00_LERNLY", "Lernly-Trainer")

DOC_EXT = {".pdf", ".pptx", ".ppt", ".docx", ".doc", ".xlsx", ".xls", ".csv",
           ".txt", ".md", ".key", ".odp", ".odt", ".rtf", ".html", ".htm",
           ".png", ".jpg", ".jpeg", ".heic", ".webp"}

# Keyword lists (German + English). Order of checks matters, see classify().
KW_EXAM = ["altklausur", "klausur", "exam", "prüfung", "pruefung", "probeklausur",
           "mock", "past paper", "midterm", "final", "simulation", "sample question",
           "musterklausur", "testat", "nachklausur", "retake"]
KW_EXERCISE = ["übung", "uebung", "ubung", "tutorial", "tutorium", "exercise",
               "problem set", "problemset", "aufgabe", "homework", "hausaufgabe",
               "worksheet", "assignment", "fallstudie", "case study", "quiz", "drill"]
KW_SLIDES = ["vorlesung", "lecture", "slides", "folien", "chapter", "kapitel",
             "unit", "class", "session", "week", "woche", "lektion", "einheit",
             "präsentation", "presentation", "addendum", "foliensatz"]
KW_SCRIPT = ["skript", "script", "summary", "zusammenfassung", "notes", "mitschrift",
             "cheat sheet", "cheatsheet", "spickzettel", "reader", "lehrbuch",
             "textbook", "handout", "formelsammlung", "formula"]
KW_SOLUTION = ["lösung", "loesung", "losung", "solution", "solved", "musterlösung",
               "answer key", "answers", "korrektur"]
KW_UNSOLVED = ["unsolved", "ohne lösung", "ohne loesung", "blank", "unbearbeitet"]
KW_IRRELEVANT = ["misc", "not exam", "nicht klausur", "sonstiges", "privat", "archive",
                 "outputs", "output"]
# Folder names are weaker evidence than file names: only clear exam folders count.
KW_EXAM_FOLDER = ["altklausur", "klausuren", "exams", "past exam", "past paper",
                  "probeklausur", "mock exam", "old exam"]

ROLE_ORDER = {"altklausur": 0, "uebung": 1, "folien": 2, "skript": 3, "sonstiges": 4}
ROLE_LABEL = {"altklausur": "Altklausur / Probeklausur", "uebung": "Übung / Tutorium",
              "folien": "Folien / Vorlesung", "skript": "Skript / Zusammenfassung",
              "sonstiges": "Sonstiges"}


def has_any(text: str, words: list[str]) -> bool:
    return any(w in text for w in words)


def classify(rel: str, ext: str) -> tuple[str, bool, bool]:
    """Return (role, has_solution, maybe_irrelevant) from path keywords."""
    low = rel.lower().replace("_", " ").replace("-", " ")
    name = os.path.basename(low)
    folders = os.path.dirname(low)
    solved = has_any(low, KW_SOLUTION) and not has_any(low, KW_UNSOLVED)
    irrelevant = has_any(folders, KW_IRRELEVANT)
    # Exam patterns like "FT23", "WS22", "SS 2021" in the file name.
    exam_code = re.search(r"\b(ft|ws|ss|st|wise|sose)\s?\d{2,4}\b", name) is not None
    if irrelevant:
        role = "sonstiges"
    elif has_any(name, KW_EXAM) or exam_code:
        role = "altklausur"
    elif has_any(name, KW_EXERCISE):
        role = "uebung"
    elif has_any(name, KW_SCRIPT):
        role = "skript"
    elif has_any(name, KW_SLIDES) or ext in {".pptx", ".ppt", ".key", ".odp"}:
        role = "folien"
    elif has_any(folders, KW_EXAM_FOLDER):
        role = "altklausur"
    elif has_any(folders, KW_EXERCISE):
        role = "uebung"
    elif has_any(folders, KW_SLIDES):
        role = "folien"
    elif ext == ".pdf":
        role = "folien"
    else:
        role = "sonstiges"
    return role, solved, irrelevant


def pdf_pages(path: Path) -> int | None:
    try:
        import pypdf  # type: ignore
    except ImportError:
        pypdf = None
    if pypdf is not None:
        try:
            return len(pypdf.PdfReader(str(path), strict=False).pages)
        except Exception:
            return None
    return None


def pptx_slides(path: Path) -> int | None:
    try:
        with zipfile.ZipFile(path) as z:
            return sum(1 for n in z.namelist()
                       if re.fullmatch(r"ppt/slides/slide\d+\.xml", n))
    except Exception:
        return None


def human_size(n: int) -> str:
    for unit in ("B", "KB", "MB", "GB"):
        if n < 1024 or unit == "GB":
            return f"{n:.0f} {unit}" if unit == "B" else f"{n:.1f} {unit}"
        n /= 1024
    return f"{n:.1f} GB"


def scan(root: Path) -> list[dict]:
    items = []
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = sorted(d for d in dirnames
                             if d not in SKIP_DIRS and not d.startswith(SKIP_DIR_PREFIXES))
        for fn in sorted(filenames):
            if fn in SKIP_FILES or fn.startswith(SKIP_PREFIXES):
                continue
            p = Path(dirpath) / fn
            ext = p.suffix.lower()
            if ext not in DOC_EXT:
                continue
            rel = str(p.relative_to(root))
            role, solved, irrelevant = classify(rel, ext)
            pages = None
            if ext == ".pdf":
                pages = pdf_pages(p)
            elif ext == ".pptx":
                pages = pptx_slides(p)
            text_file = root / "_lernly" / "text" / (rel + ".txt")
            items.append({
                "file": rel,
                "ext": ext.lstrip("."),
                "bytes": p.stat().st_size,
                "pages": pages,
                "role": role,
                "solution": solved,
                "maybeIrrelevant": irrelevant,
                "textExtracted": text_file.exists(),
            })
    items.sort(key=lambda x: (ROLE_ORDER[x["role"]], x["file"].lower()))
    return items


def to_markdown(root: Path, items: list[dict]) -> str:
    total = sum(i["bytes"] for i in items)
    pages = sum(i["pages"] or 0 for i in items)
    lines = [f"# Inventar: {root.name}", "",
             f"{len(items)} Dateien · {human_size(total)} · {pages} Seiten/Folien (soweit zählbar)", ""]
    by_role: dict[str, int] = {}
    for i in items:
        by_role[i["role"]] = by_role.get(i["role"], 0) + 1
    lines.append("Rollen (nur aus Dateinamen geraten, bitte prüfen): " + ", ".join(
        f"{ROLE_LABEL[r]} {n}" for r, n in sorted(by_role.items(), key=lambda kv: ROLE_ORDER[kv[0]])))
    lines.append("")
    lines.append("| Rolle | Datei | Typ | Seiten | Größe | Lösung | Text |")
    lines.append("|---|---|---|---|---|---|---|")
    for i in items:
        flag = " (evtl. nicht klausurrelevant)" if i["maybeIrrelevant"] else ""
        lines.append("| {role} | {file}{flag} | {ext} | {pages} | {size} | {sol} | {txt} |".format(
            role=ROLE_LABEL[i["role"]], file=i["file"].replace("|", "\\|"), flag=flag,
            ext=i["ext"], pages=i["pages"] if i["pages"] is not None else "?",
            size=human_size(i["bytes"]), sol="ja" if i["solution"] else "",
            txt="ja" if i["textExtracted"] else ""))
    unsupported = [i["file"] for i in items if i["ext"] in {"ppt", "doc", "key", "odp", "odt", "xls"}]
    if unsupported:
        lines += ["", "Alte oder seltene Formate (Text wird nicht automatisch extrahiert, "
                  "am besten als PDF exportieren):"] + [f"- {f}" for f in unsupported]
    images = [i["file"] for i in items if i["ext"] in {"png", "jpg", "jpeg", "heic", "webp"}]
    if images:
        lines += ["", f"Bilder ({len(images)}): Claude kann sie bei Bedarf direkt ansehen."]
    return "\n".join(lines) + "\n"


def main() -> int:
    ap = argparse.ArgumentParser(description="Lernly: Inventar eines Kursordners")
    ap.add_argument("folder", nargs="?", default=".")
    ap.add_argument("--out", help="Markdown-Datei schreiben (Standard: nur ausgeben)")
    ap.add_argument("--json", action="store_true", help="JSON statt Markdown ausgeben")
    args = ap.parse_args()
    root = Path(args.folder).expanduser().resolve()
    if not root.is_dir():
        print(f"Ordner nicht gefunden: {root}", file=sys.stderr)
        return 1
    items = scan(root)
    if args.json:
        out = json.dumps({"folder": str(root), "files": items}, ensure_ascii=False, indent=1)
    else:
        out = to_markdown(root, items)
    if args.out:
        Path(args.out).parent.mkdir(parents=True, exist_ok=True)
        Path(args.out).write_text(out, encoding="utf-8")
        print(f"Inventar geschrieben: {args.out} ({len(items)} Dateien)")
    else:
        print(out)
    return 0


if __name__ == "__main__":
    sys.exit(main())
