#!/usr/bin/env python3
"""Validate Lernly course files (compact format v1).

Checks kurs.json, themen/*.json, probeklausuren/*.json and spickzettel.json
inside a _lernly folder. Prints errors (must fix) and warnings (should fix).
Standard library only.

Usage:
  python3 validate.py <_lernly-folder> [--file themen/dcf.json]
Exit code 1 if there are errors.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

SLUG = re.compile(r"^[a-z0-9][a-z0-9-]{0,47}$")
SUBJECT_TYPES = {"rechnen", "verstehen", "argumentieren", "gemischt"}
FIDELITY = {"strict", "likely", "broad"}
ORIGINS = {"altklausur", "probeklausur", "uebung", "folie", "neu"}
BLOCK_FIELDS = {
    "text": ["md"], "heading": ["text"], "simple": ["md"], "example": ["md"],
    "remember": ["md"], "steps": ["items"], "formula": ["tex"],
    "table": ["head", "rows"], "figure": ["svg"], "model_answer": ["md"],
    "more": ["title", "md"],
}
HTML_TAG = re.compile(r"<\s*/?\s*(script|style|div|span|p|br|iframe|img|a|table|tr|td|th|"
                      r"b|i|u|strong|em|ul|ol|li|h[1-6]|sup|sub|font|center|button|input)\b", re.I)
# Under-escaped LaTeX in JSON turns \frac, \beta, \rho, \theta ... into control chars.
BAD_CTRL = re.compile(r"[\x08\x0c\r]|\t(?=ext|heta|imes|au|o\b|ilde|riangle|op|frac)")
OVER_ESCAPED_DELIMITER = re.compile(r"\\{2,}(?=[()[\]])")
OVER_ESCAPED_COMMAND = re.compile(r"\\{2,}(?=[A-Za-z])")
MULTILINE_TEX = re.compile(r"\\begin\{(?:aligned|align\*?|array|[pbBvV]?matrix|cases|gathered|split)\}")
SVG_FORBIDDEN = re.compile(r"<\s*script|<\s*foreignObject|\son[a-z]+\s*=|javascript:|"
                           r"(?:xlink:)?href\s*=\s*[\"']\s*(?:https?:|data:|//)", re.I)


class Report:
    def __init__(self) -> None:
        self.errors: list[str] = []
        self.warnings: list[str] = []

    def err(self, where: str, msg: str) -> None:
        self.errors.append(f"{where}: {msg}")

    def warn(self, where: str, msg: str) -> None:
        self.warnings.append(f"{where}: {msg}")


def load_json(path: Path, rep: Report, label: str | None = None):
    label = label or path.name
    try:
        raw = path.read_text(encoding="utf-8")
    except OSError as e:
        rep.err(label, f"nicht lesbar ({e})")
        return None
    try:
        return json.loads(raw)
    except json.JSONDecodeError as e:
        hint = ""
        if "escape" in e.msg.lower():
            hint = (" – in JSON muss jeder LaTeX-Backslash doppelt stehen: "
                    "\"\\\\frac{a}{b}\", \"\\\\(x\\\\)\"")
        rep.err(label, f"kein gültiges JSON (Zeile {e.lineno}, Spalte {e.colno}: {e.msg}){hint}")
        return None


# ------------------------------------------------------------ text checks

def check_text(where: str, s, rep: Report, required: bool = True) -> None:
    if s is None or (isinstance(s, str) and not s.strip()):
        if required:
            rep.err(where, "Text fehlt")
        return
    if not isinstance(s, str):
        rep.err(where, f"muss Text sein, ist {type(s).__name__}")
        return
    if BAD_CTRL.search(s):
        rep.err(where, "Steuerzeichen gefunden – LaTeX-Backslash im JSON nicht verdoppelt "
                       "(schreibe \\\\frac, \\\\beta, \\\\text, \\\\rho)")
    if OVER_ESCAPED_DELIMITER.search(s) or (("\\(" in s or "\\[" in s) and OVER_ESCAPED_COMMAND.search(s) and not MULTILINE_TEX.search(s)):
        rep.err(where, "LaTeX mehrfach maskiert: Der gespeicherte Text braucht EINEN Backslash vor Klammern und Befehlen. In rohem JSON stehen dafür genau ZWEI, nicht vier oder acht. Den Wert korrigieren, nicht nochmals JSON-kodieren.")
    if HTML_TAG.search(s):
        rep.err(where, "enthält HTML – nur Markdown-light und LaTeX erlaubt (**fett**, ==Schlüsselwort==, - Liste)")
    if s.count("\\(") != s.count("\\)"):
        rep.err(where, "Inline-Formel nicht geschlossen: Anzahl \\( und \\) unterschiedlich")
    if s.count("\\[") != s.count("\\]"):
        rep.err(where, "Formelblock nicht geschlossen: Anzahl \\[ und \\] unterschiedlich")
    if "$$" in s:
        rep.warn(where, "$$ wird nicht gerendert – nutze \\[ … \\] (Block) oder \\( … \\) (Zeile)")


def check_tex(where: str, s, rep: Report) -> None:
    if not isinstance(s, str) or not s.strip():
        rep.err(where, "Formel fehlt")
        return
    if BAD_CTRL.search(s) or "\n" in s or "\t" in s:
        rep.err(where, "Steuerzeichen in Formel – LaTeX-Backslash im JSON nicht verdoppelt "
                       "(\\\\nu, \\\\neq, \\\\theta, \\\\frac)")
    if OVER_ESCAPED_COMMAND.search(s) and not MULTILINE_TEX.search(s):
        rep.err(where, "LaTeX mehrfach maskiert: vor frac, div usw. muss im gespeicherten Text EIN Backslash stehen (in rohem JSON genau ZWEI).")
    if "\\(" in s or "\\[" in s or "$" in s.replace("\\$", ""):
        rep.warn(where, "formula.tex ohne Begrenzer schreiben (kein \\( \\[ oder $)")
    if s.count("{") != s.count("}"):
        rep.err(where, "geschweifte Klammern in der Formel nicht ausgeglichen")


def check_svg(where: str, s, rep: Report) -> None:
    if not isinstance(s, str) or not s.lstrip().startswith("<svg") or "</svg>" not in s:
        rep.err(where, "figure.svg muss mit <svg beginnen und mit </svg> enden")
        return
    if SVG_FORBIDDEN.search(s):
        rep.err(where, "SVG enthält Skript, Event-Handler, foreignObject oder externe Links – nicht erlaubt")
    if "viewBox" not in s:
        rep.warn(where, "SVG ohne viewBox skaliert auf dem Handy schlecht")
    if len(s) > 60_000:
        rep.warn(where, f"SVG sehr groß ({len(s) // 1000} KB) – vereinfachen")


def check_blocks(where: str, blocks, rep: Report, required: bool = True) -> None:
    if blocks is None:
        if required:
            rep.err(where, "Bausteine fehlen")
        return
    if not isinstance(blocks, list) or (required and not blocks):
        rep.err(where, "muss eine nicht-leere Liste von Bausteinen sein")
        return
    for i, b in enumerate(blocks):
        w = f"{where}[{i}]"
        if not isinstance(b, dict) or b.get("type") not in BLOCK_FIELDS:
            rep.err(w, f"unbekannter Baustein-Typ {b.get('type') if isinstance(b, dict) else b!r} "
                       f"(erlaubt: {', '.join(BLOCK_FIELDS)})")
            continue
        t = b["type"]
        for f in BLOCK_FIELDS[t]:
            if f not in b:
                rep.err(w, f"{t}: Feld '{f}' fehlt")
        if t in {"text", "simple", "example", "remember", "model_answer", "more"}:
            check_text(f"{w}.md", b.get("md"), rep)
        if t == "more":
            check_text(f"{w}.title", b.get("title"), rep)
        if t == "heading":
            check_text(f"{w}.text", b.get("text"), rep)
        if t == "steps":
            items = b.get("items")
            if not isinstance(items, list) or not items:
                rep.err(w, "steps.items muss eine nicht-leere Liste sein")
            else:
                for j, it in enumerate(items):
                    check_text(f"{w}.items[{j}]", it, rep)
        if t == "formula":
            tex = b.get("tex")
            if isinstance(tex, str):
                tex = [tex]
            if not isinstance(tex, list) or not tex:
                rep.err(w, "formula.tex muss eine Liste von Formeln sein")
            else:
                for j, x in enumerate(tex):
                    check_tex(f"{w}.tex[{j}]", x, rep)
            if "note" in b:
                check_text(f"{w}.note", b["note"], rep, required=False)
        if t == "table":
            head, rows = b.get("head"), b.get("rows")
            if not isinstance(head, list) or not head:
                rep.err(w, "table.head muss eine Liste sein")
            elif not isinstance(rows, list) or not rows:
                rep.err(w, "table.rows muss eine nicht-leere Liste sein")
            else:
                for j, r in enumerate(rows):
                    if not isinstance(r, list) or len(r) != len(head):
                        rep.err(f"{w}.rows[{j}]", f"braucht {len(head)} Zellen wie head")
                    else:
                        for k, c in enumerate(r):
                            check_text(f"{w}.rows[{j}][{k}]", str(c), rep, required=False)
        if t == "figure":
            check_svg(f"{w}.svg", b.get("svg"), rep)
            if "caption" in b:
                check_text(f"{w}.caption", b["caption"], rep, required=False)


# ------------------------------------------------------------ files

def check_kurs(k, rep: Report) -> dict:
    """Validate kurs.json. Returns lookup info for later checks."""
    w = "kurs.json"
    info = {"topics": set(), "slots": set(), "choice": {}}
    if not isinstance(k, dict):
        rep.err(w, "muss ein Objekt sein")
        return info
    if k.get("schema") != "lernly.kurs/1":
        rep.err(w, "schema muss \"lernly.kurs/1\" sein")
    if not isinstance(k.get("id"), str) or not SLUG.match(k.get("id", "")):
        rep.err(w, "id fehlt oder ungültig (nur a-z, 0-9, Bindestrich)")
    check_text(f"{w}.title", k.get("title"), rep)
    if not isinstance(k.get("language"), str) or not k.get("language"):
        rep.err(w, "language fehlt (Sprache des Materials, z. B. \"de\" oder \"en\")")
    if k.get("subjectType") not in SUBJECT_TYPES:
        rep.err(w, f"subjectType muss eins sein von: {', '.join(sorted(SUBJECT_TYPES))}")
    check_text(f"{w}.strategy", k.get("strategy"), rep)
    exam = k.get("exam")
    if not isinstance(exam, dict):
        rep.err(w, "exam fehlt")
        exam = {}
    if exam.get("fidelity") not in FIDELITY:
        rep.err(f"{w}.exam", "fidelity muss strict, likely oder broad sein")
    if "date" in exam and exam["date"] and not re.match(r"^\d{4}-\d{2}-\d{2}$", str(exam["date"])):
        rep.err(f"{w}.exam.date", "Format JJJJ-MM-TT")
    for f in ("durationMin", "totalPoints"):
        if f in exam and not isinstance(exam[f], (int, float)):
            rep.err(f"{w}.exam.{f}", "muss eine Zahl sein")
    parts = exam.get("parts") or []
    if not isinstance(parts, list):
        rep.err(f"{w}.exam.parts", "muss eine Liste sein")
        parts = []
    for p in parts:
        for s in (p.get("slots") or []):
            sid = s.get("id")
            if not isinstance(sid, str):
                rep.err(f"{w}.exam.parts", "slot ohne id")
                continue
            if sid in info["slots"]:
                rep.err(f"{w}.exam.parts", f"slot-id doppelt: {sid}")
            info["slots"].add(sid)
            if s.get("choiceGroup"):
                info["choice"].setdefault(s["choiceGroup"], []).append(sid)
    topics = k.get("topics")
    if not isinstance(topics, list) or not topics:
        rep.err(w, "topics muss eine nicht-leere Liste sein")
        topics = []
    exp_sum = 0.0
    for i, t in enumerate(topics):
        tw = f"{w}.topics[{i}]"
        tid = t.get("id") if isinstance(t, dict) else None
        if not isinstance(tid, str) or not SLUG.match(tid):
            rep.err(tw, "id fehlt oder ungültig")
            continue
        if tid in info["topics"]:
            rep.err(tw, f"Themen-id doppelt: {tid}")
        info["topics"].add(tid)
        check_text(f"{tw}.title", t.get("title"), rep)
        if t.get("tier") not in (1, 2, 3):
            rep.err(tw, "tier muss 1, 2 oder 3 sein")
        ep = t.get("expectedPoints")
        if not isinstance(ep, (int, float)) or ep < 0:
            rep.err(tw, "expectedPoints muss eine Zahl ≥ 0 sein")
        else:
            exp_sum += ep
        for sid in t.get("slotIds") or []:
            if info["slots"] and sid not in info["slots"]:
                rep.err(tw, f"slotId '{sid}' gibt es nicht in exam.parts")
        if not t.get("why"):
            rep.warn(tw, "why fehlt (warum ist das Thema wichtig, z. B. \"4 von 5 Altklausuren\")")
    for i, t in enumerate(topics):
        pw = t.get("pairWith") if isinstance(t, dict) else None
        if pw and pw not in info["topics"]:
            rep.err(f"{w}.topics[{i}]", f"pairWith '{pw}' ist kein Thema")
    total = exam.get("totalPoints")
    if isinstance(total, (int, float)) and total > 0 and exp_sum:
        if not (0.6 * total <= exp_sum <= 1.6 * total):
            rep.warn(w, f"Summe expectedPoints ({exp_sum:g}) passt schlecht zu totalPoints ({total:g})")
    return info


def check_thema(fname: str, th, info: dict, ids: set, rep: Report) -> None:
    w = fname
    if not isinstance(th, dict):
        rep.err(w, "muss ein Objekt sein")
        return
    if th.get("schema") != "lernly.thema/1":
        rep.err(w, "schema muss \"lernly.thema/1\" sein")
    tid = th.get("id")
    if tid != Path(fname).stem:
        rep.err(w, f"id '{tid}' muss dem Dateinamen entsprechen ('{Path(fname).stem}')")
    if info["topics"] and tid not in info["topics"]:
        rep.err(w, f"Thema '{tid}' steht nicht in kurs.json topics")
    check_blocks(f"{w}.theory", th.get("theory"), rep)
    if "standardAnswer" in th:
        check_blocks(f"{w}.standardAnswer", th.get("standardAnswer"), rep, required=False)
    for f in ("hook", "source"):
        if f in th:
            check_text(f"{w}.{f}", th[f], rep, required=False)
    if not th.get("source"):
        rep.warn(w, "source fehlt (Folien/Seiten angeben, damit man nachschlagen kann)")
    mistakes = th.get("mistakes", [])
    if not isinstance(mistakes, list):
        rep.err(f"{w}.mistakes", "muss eine Liste sein")
    else:
        for j, m in enumerate(mistakes):
            check_text(f"{w}.mistakes[{j}]", m, rep)
    tasks = th.get("tasks", [])
    if not isinstance(tasks, list):
        rep.err(f"{w}.tasks", "muss eine Liste sein")
        tasks = []
    if not tasks:
        rep.warn(w, "keine Übungsaufgaben – ohne Übung steigt die Mastery kaum")
    for i, t in enumerate(tasks):
        check_task(f"{w}.tasks[{i}]", t, ids, rep)
    cards = th.get("cards", [])
    if not isinstance(cards, list):
        rep.err(f"{w}.cards", "muss eine Liste sein")
        cards = []
    for i, c in enumerate(cards):
        cw = f"{w}.cards[{i}]"
        cid = c.get("id") if isinstance(c, dict) else None
        if not isinstance(cid, str) or not cid:
            rep.err(cw, "id fehlt")
        elif cid in ids:
            rep.err(cw, f"id doppelt im Kurs: {cid}")
        else:
            ids.add(cid)
        check_text(f"{cw}.front", c.get("front") if isinstance(c, dict) else None, rep)
        check_text(f"{cw}.back", c.get("back") if isinstance(c, dict) else None, rep)


def check_task(w: str, t, ids: set, rep: Report) -> None:
    if not isinstance(t, dict):
        rep.err(w, "muss ein Objekt sein")
        return
    tid = t.get("id")
    if not isinstance(tid, str) or not tid:
        rep.err(w, "id fehlt")
    elif tid in ids:
        rep.err(w, f"id doppelt im Kurs: {tid}")
    else:
        ids.add(tid)
    check_text(f"{w}.name", t.get("name"), rep)
    if t.get("origin") not in ORIGINS:
        rep.err(w, f"origin muss eins sein von: {', '.join(sorted(ORIGINS))}")
    kind = t.get("kind")
    if kind == "drill":
        variants = t.get("variants")
        if not isinstance(variants, list) or not variants:
            rep.err(w, "drill.variants muss eine nicht-leere Liste sein")
            return
        if t.get("origin") == "neu" and len(variants) < 3:
            rep.warn(w, "neue Rechenaufgabe mit weniger als 3 Varianten – 3 bis 5 einplanen")
        for j, v in enumerate(variants):
            vw = f"{w}.variants[{j}]"
            check_text(f"{vw}.text", v.get("text"), rep)
            fields = v.get("fields")
            if not isinstance(fields, list) or not fields:
                rep.err(vw, "fields muss eine nicht-leere Liste sein")
            else:
                for k, f in enumerate(fields):
                    fw = f"{vw}.fields[{k}]"
                    check_text(f"{fw}.label", f.get("label"), rep)
                    if not isinstance(f.get("answer"), (int, float)) or isinstance(f.get("answer"), bool):
                        rep.err(fw, "answer muss eine Zahl sein (Punkt als Dezimaltrenner)")
                    for tk in ("tol", "rel"):
                        if tk in f and (not isinstance(f[tk], (int, float)) or f[tk] < 0):
                            rep.err(fw, f"{tk} muss eine Zahl ≥ 0 sein")
            ch = v.get("choice")
            if ch is not None:
                if not isinstance(ch.get("options"), list) or ch.get("answer") not in ch.get("options", []):
                    rep.err(f"{vw}.choice", "answer muss genau einer der options entsprechen")
            check_blocks(f"{vw}.solution", v.get("solution"), rep)
    elif kind == "essay":
        pts = t.get("points")
        if not isinstance(pts, (int, float)) or pts <= 0:
            rep.err(w, "essay.points muss > 0 sein")
        check_text(f"{w}.question", t.get("question"), rep)
        check_checklist(w, t.get("checklist"), pts, rep)
        check_blocks(f"{w}.modelAnswer", t.get("modelAnswer"), rep)
    elif kind == "mc":
        check_mc(w, t.get("questions"), rep)
    else:
        rep.err(w, "kind muss drill, essay oder mc sein")


def check_checklist(w: str, cl, pts, rep: Report) -> None:
    if not isinstance(cl, list) or not cl:
        rep.err(f"{w}.checklist", "muss eine nicht-leere Liste sein")
        return
    s = 0.0
    for j, c in enumerate(cl):
        check_text(f"{w}.checklist[{j}].text", c.get("text") if isinstance(c, dict) else None, rep)
        p = c.get("points") if isinstance(c, dict) else None
        if not isinstance(p, (int, float)) or p <= 0:
            rep.err(f"{w}.checklist[{j}]", "points muss > 0 sein")
        else:
            s += p
    if isinstance(pts, (int, float)) and abs(s - pts) > 1e-6:
        rep.warn(f"{w}.checklist", f"Summe der Checklisten-Punkte ({s:g}) ≠ points ({pts:g})")


def check_mc(w: str, qs, rep: Report) -> None:
    if not isinstance(qs, list) or not qs:
        rep.err(f"{w}.questions", "muss eine nicht-leere Liste sein")
        return
    for j, q in enumerate(qs):
        qw = f"{w}.questions[{j}]"
        check_text(f"{qw}.q", q.get("q"), rep)
        opts = q.get("options")
        if not isinstance(opts, list) or len(opts) < 2:
            rep.err(qw, "mindestens 2 options")
            continue
        for k, o in enumerate(opts):
            check_text(f"{qw}.options[{k}]", o, rep)
        a = q.get("answer")
        if not isinstance(a, int) or isinstance(a, bool) or not (0 <= a < len(opts)):
            rep.err(qw, f"answer muss ein Index 0…{len(opts) - 1} sein")
        if not q.get("explain"):
            rep.warn(qw, "explain fehlt (warum richtig, warum die anderen falsch)")
        else:
            check_text(f"{qw}.explain", q.get("explain"), rep)


def check_mock(fname: str, m, info: dict, rep: Report) -> None:
    w = fname
    if not isinstance(m, dict):
        rep.err(w, "muss ein Objekt sein")
        return
    if m.get("schema") != "lernly.probeklausur/1":
        rep.err(w, "schema muss \"lernly.probeklausur/1\" sein")
    if m.get("id") != Path(fname).stem:
        rep.err(w, "id muss dem Dateinamen entsprechen")
    check_text(f"{w}.name", m.get("name"), rep)
    if not isinstance(m.get("durationMin"), (int, float)) or m.get("durationMin", 0) <= 0:
        rep.err(w, "durationMin muss > 0 sein")
    items = m.get("items")
    if not isinstance(items, list) or not items:
        rep.err(w, "items muss eine nicht-leere Liste sein")
        return
    seen, groups, total = set(), {}, 0.0
    for i, it in enumerate(items):
        iw = f"{w}.items[{i}]"
        iid = it.get("id")
        if not isinstance(iid, str) or iid in seen:
            rep.err(iw, "id fehlt oder doppelt")
        seen.add(iid)
        if info["topics"] and it.get("topicId") not in info["topics"]:
            rep.err(iw, f"topicId '{it.get('topicId')}' ist kein Thema")
        pts = it.get("points")
        if not isinstance(pts, (int, float)) or pts <= 0:
            rep.err(iw, "points muss > 0 sein")
            pts = 0
        check_text(f"{iw}.question", it.get("question"), rep)
        if it.get("type") == "open":
            check_checklist(iw, it.get("checklist"), pts, rep)
            check_blocks(f"{iw}.solution", it.get("solution"), rep)
        elif it.get("type") == "mc":
            check_mc(iw, it.get("questions"), rep)
            if isinstance(it.get("questions"), list) and len(it["questions"]) != pts:
                rep.warn(iw, "bei MC zählt jede Frage 1 Punkt: points sollte der Anzahl Fragen entsprechen")
        else:
            rep.err(iw, "type muss open oder mc sein")
        if it.get("choiceGroup"):
            groups.setdefault(it["choiceGroup"], []).append(pts)
        else:
            total += pts
    for g, pl in groups.items():
        if len(pl) < 2:
            rep.warn(w, f"Wahlgruppe '{g}' hat nur eine Aufgabe")
        total += max(pl)
    tp = m.get("totalPoints")
    if isinstance(tp, (int, float)) and abs(tp - total) > 1e-6:
        rep.warn(w, f"totalPoints ({tp:g}) ≠ Summe der Aufgaben ({total:g}, Wahlgruppen einmal gezählt)")


def check_cheat(c, info: dict, rep: Report) -> None:
    w = "spickzettel.json"
    if not isinstance(c, dict) or c.get("schema") != "lernly.spickzettel/1":
        rep.err(w, "schema muss \"lernly.spickzettel/1\" sein")
        return
    secs = c.get("sections")
    if not isinstance(secs, list) or not secs:
        rep.err(w, "sections muss eine nicht-leere Liste sein")
        return
    for i, s in enumerate(secs):
        check_text(f"{w}.sections[{i}].title", s.get("title"), rep)
        check_blocks(f"{w}.sections[{i}].blocks", s.get("blocks"), rep)


# ------------------------------------------------------------ main API

def validate_dir(d: Path, only: str | None = None):
    """Validate a _lernly folder. Returns (report, data) where data is the
    merged course for the trainer (None if kurs.json is unusable)."""
    rep = Report()
    kurs = load_json(d / "kurs.json", rep) if (d / "kurs.json").exists() else None
    if kurs is None and not (d / "kurs.json").exists():
        rep.err("kurs.json", f"nicht gefunden in {d}")
    info = check_kurs(kurs, rep) if kurs is not None else {"topics": set(), "slots": set(), "choice": {}}
    data = {"course": kurs, "topics": {}, "mocks": [], "cheatsheet": None}
    ids: set = set()
    for f in sorted((d / "themen").glob("*.json")) if (d / "themen").is_dir() else []:
        rel = f"themen/{f.name}"
        th = load_json(f, rep, rel)
        if th is None:
            continue
        if only and only != rel:
            # still collect ids so duplicates across files are caught
            sub = Report()
            check_thema(rel, th, info, ids, sub)
        else:
            check_thema(rel, th, info, ids, rep)
        if isinstance(th, dict):
            data["topics"][th.get("id")] = th
    for f in sorted((d / "probeklausuren").glob("*.json")) if (d / "probeklausuren").is_dir() else []:
        rel = f"probeklausuren/{f.name}"
        m = load_json(f, rep, rel)
        if m is None:
            continue
        check_mock(rel, m, info, rep if not only or only == rel else Report())
        data["mocks"].append(m)
    cf = d / "spickzettel.json"
    if cf.exists():
        c = load_json(cf, rep)
        if c is not None:
            check_cheat(c, info, rep if not only or only == "spickzettel.json" else Report())
            data["cheatsheet"] = c
    if kurs is not None and not only:
        missing = [t for t in info["topics"] if t not in data["topics"]]
        if missing:
            rep.warn("kurs.json", "Themen ohne Datei in themen/ (werden als 'kommt noch' angezeigt): "
                     + ", ".join(sorted(missing)))
        if not data["mocks"]:
            rep.warn("probeklausuren/", "noch keine Probeklausur")
    return rep, (data if kurs is not None else None)


def main() -> int:
    ap = argparse.ArgumentParser(description="Lernly: Kursdateien prüfen")
    ap.add_argument("folder", nargs="?", default="_lernly")
    ap.add_argument("--file", help="nur diese Datei melden, z. B. themen/dcf.json")
    args = ap.parse_args()
    d = Path(args.folder).expanduser().resolve()
    rep, _ = validate_dir(d, args.file)
    for e in rep.errors:
        print("FEHLER   " + e)
    for wmsg in rep.warnings:
        print("HINWEIS  " + wmsg)
    if not rep.errors:
        print(f"OK – keine Fehler ({len(rep.warnings)} Hinweise)")
    return 1 if rep.errors else 0


if __name__ == "__main__":
    sys.exit(main())
