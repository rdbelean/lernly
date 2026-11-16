# Lernly Light Redesign — Design und Gestaltungsrichtlinie

Stand: 2026-11-16 · Status: **Entwurf, wartet auf Freigabe von Daniel** · Gewählt: Richtung B „Klausurkarte“, hell, ganze App auf einmal.

Quellen der Regeln: Impeccable (Modus Operate für App, Persuade für Landing; Verbotsliste), Taste-Skill (kein Bildtext, gleiche Ränder, echte UI in einem App-Rahmen), Emil Kowalski (Bewegung nur mit Zweck). Keines der drei Plugins wird installiert; nur die Regeln fließen ein.

## 1. Absicht

Die Seite wirkt „basic und langweilig“: viele gleich große Karten, Kennzahl mit Balken, Pillen-Labels, tintenfarbene Icon-Kacheln. Dazu passen Landing (hell) und App (dunkel) nicht zusammen. Studierende sollen beim Anblick denken: „Das zeigt mir sofort, wo ich anfangen soll.“

Die Gestaltung löst den größten Pain Point: „Ich weiß nicht, wo ich anfangen soll.“ Signatur ist die **Klausurkarte**: Themen als Flächen, Größe = Gewicht in der Klausur, Farbe = Lernstand. Darüber steht immer **ein** nächster Schritt.

## 2. Ziele, Nicht-Ziele, Anti-Ziele

**Ziele**
- Eine helle Designsprache für die ganze App und die Landing (ein Token-Satz).
- Neues Dashboard mit „Nächster Schritt“ + Klausurkarte, mit echten Daten.
- Landing-Hauptbild und Feature-Mockups als **statische** Ausgaben derselben Komponenten, nicht klickbar.
- Mobile-first, funktioniert bei 380 px.

**Nicht-Ziele**
- Kein Dark Mode in diesem Schritt (Token-Struktur hält ihn später offen).
- Keine neuen Features, keine DB-Änderung, keine neuen Abhängigkeiten, keine Änderung an Auth-/Stripe-Logik.
- Rechtstexte inhaltlich unangetastet.
- Keine EN-Landing-Parität.

**Anti-Ziele** (wäre ein Fehlschlag, auch wenn es technisch läuft)
- Ein Mockup zeigt etwas, das die App nicht kann.
- Wieder ein Raster gleich großer Karten.
- Neue Hex-Werte verstreut im Code statt Tokens.
- Text unter 12 px oder Kontrast unter 4,5:1.

## 3. Rahmen (aus CLAUDE.md und Code)

- Branch: aktueller Arbeitsbranch `codex/lernly-mcp-beta`. Der Umbau ist groß und enthält Plugin-Arbeit nicht; Vorschlag: eigener Redesign-Branch oder Release-Worktree wie bei PR #33/#34. **Entscheidung von Daniel nötig** (Branch-Wechsel nur nach Absprache, Eintrag in STATUS.md).
- Nie direkt auf `main`; Vercel-Preview-Test durch Daniel vor Merge; Merge nur nach Rückfrage.
- Datenbank wird mit Produktion geteilt: dieser Umbau braucht **keine** Migration.
- Rechtsseiten (`agb`, `datenschutz`, `impressum`, `widerruf`) und Auth/Stripe: nur Farbtokens, Texte und Logik bleiben. Das braucht Daniels ausdrückliche Zustimmung (siehe 9).
- Inventar: 18 Routen, 139 TSX-Dateien, **1.600 fest verdrahtete Farbwerte in 113 Dateien** (größte: `globals.css` 220, `landing-client.tsx` 105, `QuizView` 67, `dashboard/new/page.tsx` 55, `ExamSimulator` 44, `NewExamForm` 39). Das ist der eigentliche Aufwand.

## 4. Ansätze (verglichen, gewählt: Mischweg)

1. Landing zuerst: schnell, aber Bilder ohne App dahinter. Verworfen (Fake-Feature-Regel).
2. App zuerst, Landing danach per Screenshot: ehrlich, aber lange ohne sichtbares Ergebnis.
3. **Mischweg (gewählt):** Richtlinie + Token-Datei, Klausurkarte als echte Komponente, Landing-Bilder sind statische Ausgaben derselben Komponente, danach Rest der App.

Umfang: **ganze App auf einmal** (Daniel, 2026-11-16). Risiko wird durch Commit-Reihenfolge und Vorschau begrenzt, siehe 8.

## 5. Gestaltungsrichtlinie

### Farben (Tokens, einzige Quelle: `globals.css`)

| Token | Wert | Zweck |
|---|---|---|
| `--bg` | `#F3F5FB` | Seitenhintergrund |
| `--surface` | `#FFFFFF` | Karten, Panels |
| `--surface-2` | `#EAEEF8` | Eingaben, Hover, Chips |
| `--line` | `rgba(18,23,43,.10)` | Haarlinien |
| `--ink` | `#12172B` | Text |
| `--ink-dim` | `#5A6280` | Zweittext |
| `--ink-faint` | `#626A88` | Hinweise (≥ 4,5:1 auf Weiß, im Build prüfen) |
| `--primary` | `#3646D6` | Einziger gefüllter CTA, weißer Text |
| `--primary-press` | `#2B3499` | Gedrückt (alter CTA-Ton) |

**Farbe = Bedeutung, überall gleich:**

| Bedeutung | Fläche | Text |
|---|---|---|
| Sicher | `#D4F0E0` | `#0E4A2C` |
| In Arbeit / jetzt dran | `#DCE2FA` (jetzt dran: Primary gefüllt) | `#1B2A7A` |
| Offen | Weiß + Linie | `--ink` |
| Dringend (Countdown) | `#FDF0DC` | `#8A4B0B` |
| Fehler | `#FCE8E6` | `#B3261E` |

Keine weitere Farbe für Dekoration. Die Mockups in der Vorschau zeigten „Punkte“; echte Daten liefern Anteile (siehe 6). Mein Vorschlag, nicht entschieden: Primary wird heller (`#3646D6`) als der bisherige `#2B3499`, weil die Fläche im hellen Layout sonst zu schwer wirkt.

### Schrift
Sora (Überschriften) und Inter (Text) bleiben, sind schon geladen. Skala: Display 30–40 px / 500 / −0,02 em · Titel 20 · Text 15–16 · klein min. **12 px**. Zahlen tabellarisch (`tabular-nums`). Satzbau: Überschrift sagt den Inhalt („Heute: Discounted Cashflow“), keine Kategorie-Etiketten.

### Form
Radius: Karten 14, Controls 10, Pillen nur für kleine Chips. Karten: Haarlinie, **kein** Schatten; Schatten nur für Popover/Dialoge (versetzt, weich). Keine Karte in Karte. Icons: lucide, direkt neben Text, **keine** getönte Kachel über jeder Überschrift.

### Verboten (Impeccable-Floor + Lernly)
Gleich große Karten-Raster als Seitenstruktur · Kennzahl-Template (große Zahl + Balken + Nebenwerte) · Kicker/Eyebrow über Überschriften (auch gesperrte Großbuchstaben-Labels) · Verlaufstext · Glas/Blur als Dekor · farbiger Seitenstreifen > 1 px · Emojis · Bildunterschriften unter Mockups · Text < 12 px.

### Bewegung (Emil)
Nur mit Zweck: Druck-Feedback `scale(.97)` an Buttons (100–160 ms), Hover nur mit `(hover:hover)`, Ein-/Ausblenden `ease-out` 150–250 ms, nie `transition: all`, nie ab `scale(0)`, keine Animation für Tastaturaktionen, `prefers-reduced-motion` respektiert. Eine inszenierte Bewegung pro Seite (Klausurkarte baut sich einmal auf), kein Fade-in pro Abschnitt.

## 6. Das Dashboard

```
[Fach · Klausur in 6 Tagen]
Heute: Discounted Cashflow.                       (Display, ein Satz)
25 Minuten, bis zu 11 Punkte mehr.        [ Jetzt starten ]
─────────────────────────────────────────────────────────
Klausurkarte  (Fläche = Punkte, Farbe = Stand)      | Heute fällig
┌──────────────┬──────────────┬─────┬──────┐        | 12 Karten · 6 Min
│ Kapitalstr.  │ DCF (jetzt)  │WACC │ Ertr.│        | Weiter lernen
│ sicher       │              │     │ offen│        | Streak
└──────────────┴──────────────┴─────┴──────┘
```

- Mehrere Klausuren: Auswahl über die nächste Klausur; weitere als schmale Liste darunter.
- Datenquelle (korrigiert nach Code-Prüfung): **Themen haben im Schema keine Punkte**, nur Fragen im Simulator (`points`). Darum: Flächengröße = `exam_profile.topics[].weight` (Anteil aus der Altklausur, 0–1), sonst Summe der Konzept-Wichtigkeit (`importance` high 3 / medium 2 / low 1, +1 bei `relevanceTag`). Angezeigt wird ein **Anteil in %** nur bei Altklausur-Gewicht; sonst keine Zahl. Stand je Thema aus den Quizdaten (`per_topic`): sicher = richtig > 0 und falsch = 0, in Arbeit = Versuch vorhanden, offen = kein Versuch (gleiche Regel wie `topicsDone`). Bestehende Daten: `getStudentProgress` + `study_packs.pack_data->overview->topics`.
- Leer-Zustand (neuer Nutzer): ein Satz + Upload-Button, keine leere Karte.
- 380 px: Karte wird zweispaltig mit Spannen nach Gewicht, darunter die Spalte „Heute fällig“.
- Tippen/Klick auf eine Fläche öffnet das Thema im Paket (Navigation, keine Fake-Aktion).

## 7. Landing

- Hero-Bild: dieselbe Dashboard-Komponente mit Beispieldaten in einem App-Rahmen, **inert** (nicht klickbar, nicht fokussierbar), keine Bildunterschrift, gleiche linke/rechte Kante. Mein Vorschlag: gerenderte Komponente statt PNG, damit sie scharf bleibt und nie vom Design abweicht.
- Feature-Mockups (Karteikarte, Rechenaufgabe, Themen, Tagesplan, Lerntipps): statische Ausgaben der echten Komponenten; jede Grafik einmal, Text ≥ 12 px.
- Abschnittsstruktur bleibt (Hero → DemoPacks → HowItWorks → Showcase → Bento → Vergleich → ToolStack → Pricing → FAQ → BottomCta), kein Karten-Raster pro Abschnitt: wechselnde Kompositionen.
- Texte nicht ohne den `lernly-copywriter` ändern; hier nur Layout/Farbe.

## 8. Umsetzung (Reihenfolge, je ein kleiner Commit)

1. Tokens + Richtlinie in `globals.css`; Skript, das neue Hex-Werte außerhalb von Tokens meldet.
2. App-Shell (`DashboardShell`, Profilmenü, Modals, Basis-UI).
3. Dashboard (Klausurkarte, Heute dran), Wiederholen, Neues Paket.
4. Pack-Ansichten (Hub, Karteikarten, Quiz, Simulator, Offene Fragen, Visual Map, Übersicht, Tutor, Essay) inkl. `studyguide/palette.ts`.
5. Login, Settings, Checkout-Erfolg, Admin, Claim.
6. Landing + statische Mockups; Hochschulen- und Prüfungsvorbereitungsseite.
7. Rechtsseiten: nur Tokens (nach Zustimmung).

Mechanik: häufige Muster (`rgba(255,255,255,.06)` → `--line` usw.) per Skript ersetzen, den Rest von Hand, dann Sichtprüfung. Dunkle Overlays ergeben auf Hell nicht automatisch Sinn.

**Prüfung vor Übergabe:** `npm run build` und Lint; Sicht bei 380 / 768 / 1440 px auf Landing, Dashboard, Wiederholen, Paket, Login, Settings; Kontrast ≥ 4,5:1 (Text) automatisch gemessen; keine Konsolenfehler; Hex-Zähler gegen Start (1.600) mit Ziel ~0 außerhalb Tokens/Marken-Logos. Danach Vercel-Preview-URL an Daniel.

## 9. Offene Punkte (nur Daniel kann entscheiden)

1. **Branch:** eigener Redesign-Branch/Worktree statt `codex/lernly-mcp-beta`?
2. **Rechtsseiten** farblich mitumstellen (nur Tokens, keine Textänderung)? Ohne Zustimmung bleiben sie dunkel, was auf einer hellen Seite auffällt.
3. `CLAUDE.md`-Abschnitt „Design System“ nach Freigabe aktualisieren (er beschreibt noch Dunkel und Icon-Kacheln).

Vom Bauenden zu klären (meine Annahmen, markiert): Primary-Ton, Gerenderte Komponente statt PNG fürs Hero, Gewicht-Fallback der Klausurkarte, Auswahl bei mehreren Klausuren.
