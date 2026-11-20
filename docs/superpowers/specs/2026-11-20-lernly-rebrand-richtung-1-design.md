# Lernly-Rebrand „Klar und belohnend“ (Richtung 1)

Stand: 2026-11-20 · Status: Entwurf zur Freigabe · Logo: separates Folgeprojekt

## Absicht

Daniel will ein komplettes UI-Rebranding. Jede der zehn Referenzseiten soll erkennbar etwas in Lernly hinterlassen. Gewählt ist Richtung 1, „Klar und belohnend“: ruhige Fläche, präzise Typografie, kräftige Lern-Grafiken und ein kleiner, verdienter Belohnungsmoment nach jedem Erfolg. Vorbild für die Richtung sind Brilliant und Khan Academy.

Warum das zur Zielgruppe passt: BWL-Studis, die kurz vor der Klausur gestresst und oft ADHS-geprägt sind. Eine ruhige Oberfläche nimmt Überforderung, Grafiken machen Rechen- und Steuerthemen schnell begreifbar. Die Belohnung bringt Duolingo-Motivation, ohne kindlich zu wirken.

## Ziele

- Eine einheitliche Marke über Landing, Dashboard, Trainer und Onboarding.
- Jede Referenz liefert genau ein sichtbares Prinzip (Tabelle unten).
- Alles funktioniert und sieht gut aus bei 380 px und auf Desktop.
- Jedes Paket geht einzeln live und lässt sich einzeln zurückrollen.

## Nicht-Ziele

- Logo. Es kommt als eigenes Projekt nach Paket 1, wenn Farben und Schrift stehen.
- Dark Mode. Er kann später als Zusatz kommen (Richtung 6).
- Englische Landing-Parität.
- Preise, Stripe, DB-Migrationen und neue Abhängigkeiten. Alles wird mit CSS und eigenem React gebaut.
- Rechtstexte. Die Rechtsseiten erben nur die neuen Tokens automatisch, ihr Text bleibt unverändert.

## Anti-Ziele

Das Rebrand ist gescheitert, auch wenn es technisch läuft, wenn eines davon eintritt:

- Es wirkt kindlich: Maskottchen, Konfetti-Regen oder Großbuchstaben-Buttons.
- Mehr visuelles Rauschen als heute: mehr Farben, mehr Chips, mehr Schatten.
- Text ist bei 380 px abgeschnitten oder schlechter lesbar, oder ein Kontrast liegt unter 4,5:1.
- Erfundener Social Proof, etwa Uni-Logos ohne Erlaubnis oder ausgedachte Nutzerzahlen.
- Bewegung, die ohne Grund läuft, oder `prefers-reduced-motion` wird ignoriert.

## Rahmenbedingungen

- Next.js App Router und Tailwind v4. Tokens liegen in `src/app/globals.css` (`@theme inline`), `npm run check:colors -- --strict` muss grün sein.
- Icons kommen nur aus lucide-react, keine Emojis. App-Chrome bleibt Deutsch.
- Die Landing nutzt CSS-Module mit ungelayerten Regeln (`.page p {margin:0}`). Neue Landing-Teile kommen deshalb in eigene Module.
- Closed Beta: Der Haupt-CTA ist `mailto:` („Beta-Zugang anfragen“), der Login ist nur für Admins. Onboarding vor dem Login darf also nicht in eine Registrierung führen.
- Auto-Live: Nach `tsc`, Lint, Tests und Farbcheck geht jedes Paket per Fast-Forward nach `main`.

## Ansätze

| Ansatz | Abwägung | Entscheidung |
|---|---|---|
| A. Erst das Fundament (Tokens, Schrift, Bewegung, Grundbausteine), dann Bereich für Bereich | Klein, einzeln live und einzeln rückrollbar | **Gewählt** (Claudes Wahl, Daniel hat das Wie übergeben) |
| B. Alles auf einem Branch, ein Release | Wochenlang nichts live, schwer rückrollbar, widerspricht „kleine Commits“ | verworfen |
| C. Erst eine Styleguide-Seite, dann Migration | Sauber, bringt Studis aber nichts; nur als kleine interne Vorschau Teil von A | verworfen |

## Fundament (Paket 1)

### Farbe: ruhig, warm, ein Akzent (MUJI, Aesop, Notion)

| Token | Heute | Neu | Grund |
|---|---|---|---|
| `--color-bg` | `#F3F5FB` (kühl) | `#F7F7F4` (warmes Papier) | Aesop-, MUJI- und Notion-Wärme, weniger „Software-Blau“ |
| `--color-surface` | `#FFFFFF` | `#FFFFFF` | bleibt |
| `--color-surface-2` | `#EAEEF8` | `#EFEEEA` | warmer Chip- und Input-Ton |
| `--color-line` | `rgba(18,23,43,.10)` | `rgba(22,24,29,.10)` | neutrale Haarlinie |
| `--color-text` | `#12172B` | `#16181D` | warm-neutrale Tinte statt Blauschwarz |
| `--color-text-dim` | `#5A6280` | `#5B5E66` | |
| `--color-text-faint` | `#626A88` | `#6A6D75` | ca. 4,8:1 auf `#F7F7F4` |
| `--color-primary` | `#3646D6` | `#3646D6` | bleibt; Indigo ist der einzige Akzent und trägt die Markenwiedererkennung |
| Semantik ok, work, urgent, err | unverändert | unverändert | Farbe bedeutet weiter etwas |

Belohnung bekommt keinen neuen Farbton. Der Gold-Ton aus der Skizze ist gestrichen, weil er mit „urgent“ (Bernstein) kollidieren würde. Belohnung ist Indigo in Bewegung plus Grün (ok), das „gesichert“ schon heute bedeutet.

Die Ink-Alpha-Tokens (`--color-ink-a*`), `--color-scrim` und `--shadow-pop` wandern auf die neue Tinte `#16181D`.

### Typografie: eine Familie, wenige Größen (Pentagram, Linear)

- **Nur noch Inter.** Sora fällt weg. `--font-display` zeigt auf Inter, und die 144 Stellen, die `--font-display` oder `--font-heading` nutzen, ziehen automatisch mit. Der Sora-Import in `src/app/layout.tsx` wird entfernt.
- **Skala in 6 Stufen:** 12, 14, 16, 20, 28, 40 px. Der Hero bekommt 56 px auf Desktop und 36 px mobil.
- **Gewichte:** 400 Text, 500 UI und Labels, 600 Überschriften. Kein 700 und 800 mehr.
- **Laufweite:** Überschriften ab 28 px −0,02 em, Hero −0,03 em, Fließtext normal. Zahlen mit `tabular-nums`.

### Bewegung (Apple, Framer)

Neue Tokens:

- `--dur-fast: 120ms`, `--dur-base: 220ms`, `--dur-slow: 480ms`
- `--ease-out: cubic-bezier(.22,1,.36,1)`, `--ease-spring: cubic-bezier(.34,1.56,.64,1)`

Regeln:

- Bewegung erklärt immer einen Zustand. Bei `prefers-reduced-motion` laufen Übergänge auf 0 ms, nichts startet automatisch.
- Es werden nur `transform` und `opacity` animiert.

### Grundbausteine

- **Button:** Primär ist Indigo mit 10 px Radius und Höhe 44 (mobil 48). Beim Drücken `scale(.97)` in `--dur-fast`, beim Überfahren eine leicht dunklere Fläche. Pro Ansicht gibt es einen Primär-Button.
- **Karte:** 14 px Radius, Haarlinie, kein Schatten. Klickbare Karten heben sich beim Überfahren um 2 px über `transform`, und die Linie wird dunkler.
- **Chip und Tab:** Die Tab-Markierung gleitet zum aktiven Tab, wie bei Framer.
- **Lern-Grafik-Stil (Brilliant):** flache geometrische SVGs in Indigo, Grün und Tinte auf Papier, 2 px Linien, keine Verläufe. Der Stil wird als kurze Regel in `ARCHITECTURE.md` festgehalten.

**Fertig, wenn:** Die Tokens sind umgestellt, Sora ist entfernt, der Farbcheck ist grün, und eine interne Vorschau unter `/dashboard/settings` (nur Admin) zeigt Buttons, Karte, Chip und Tabs. Landing und Dashboard sind bei 380 und 1440 px durchgesehen, ohne Abschneiden.

## Jede Referenz liefert ein Prinzip

| Referenz | Prinzip | Wo in Lernly | Paket |
|---|---|---|---|
| Apple (Animationen) | Eine Aussage pro Bildschirm, Bewegung beim Scrollen | Landing: Abschnitte blenden beim Scrollen ein (Opacity plus 12 px), die 3 Schritte als Scroll-Sequenz mit festem Trainer-Bild | 2 |
| Duolingo (Onboarding) | Erst ausprobieren, eine Frage pro Bildschirm | Landing: „Welche Klausur?“-Kacheln (Finance, Steuern, Mathe, Marketing) führen zur passenden Demo-Karte zum Ausprobieren und dann zu „Beta-Zugang anfragen“ mit vorausgefülltem Fach im `mailto`. Dashboard: der Onboarding-Assistent zeigt eine Frage pro Schritt mit Fortschrittsbalken | 2 und 5 |
| Linear (UI) | Präzision, ruhige Gewichte, Tastatur zuerst | Gewichte und Laufweite aus dem Fundament; sichtbare Tastenkürzel im Trainer; Cmd+K öffnet die Suche | 1 und 3 |
| Pentagram (Typografie) | Eine Familie, wenige Größen | Nur Inter, 6-Stufen-Skala | 1 |
| MUJI (Minimalismus) | Eine Tinte, ein Akzent, keine Deko | Deko-Chips und Zierelemente streichen; Regel „ein Akzent pro Ansicht“ | 1 bis 5 |
| Airbnb (Suche und Filter) | Eine Suchpille mit Segmenten und Vorschlägen | Dashboard: Pille „Fach · Thema · Typ“ (Typ: Rechnen, Karte, Klausurfalle), darunter Vorschläge mit Icon und Untertitel („Fällig heute“, „Bringt die meisten Punkte“). Durchsucht die geladenen Kurse lokal im Browser | 3 |
| Aesop (Art Direction) | Warme, ruhige, erwachsene Bildsprache | Papierton, warme Tinte, Lern-Grafik-Stil, ruhige Texte ohne Ausrufezeichen | 1 |
| Notion (Dashboard) | Jede Einheit ist eine Seite mit Icon und großem Titel, gegliederte Seitenleiste | Kurs-Kopf mit Icon (lucide, vom Fach abgeleitet) und großem Titel, Breadcrumb; Seitenleiste mit den Abschnitten Heute und Kurse (ein Abschnitt Klausuren erst, wenn Trainer-Kurse ein Klausurdatum tragen; heute haben sie keins) | 3 |
| Stripe (Landing) | Zweifarbige Überschrift, Kachel-Raster aus echter Produkt-UI | Hero-Satz dunkel plus grauer Rest; Kacheln mit echten Trainer-Bausteinen (Klausurplan, Formel, Karte, Probeklausur) statt Feature-Text. Statt Logo-Reihe eine Fächer-Reihe, kein erfundener Social Proof | 2 |
| Framer (Mikro-Interaktionen) | Federnde, kleine Rückmeldungen | Druck-Effekt der Buttons, gleitende Tab-Markierung, Haken-Morph bei „Gespeichert“, Punkte zählen hoch, Karten-Flip mit Feder | 1 und 4 |

## Pakete (Reihenfolge)

1. **Fundament:** Tokens, Inter-only, Bewegung, Grundbausteine, interne Vorschau.
2. **Landing:** Stripe-Layout, Apple-Scroll, Duolingo-Einstieg mit Beta-`mailto`. Die Hero-Story bleibt und übernimmt nur die neuen Tokens.
3. **Dashboard:** Notion-Struktur, Airbnb-Suche mit Cmd+K, Linear-Tastenkürzel.
4. **Trainer:** Framer-Mikro-Interaktionen und Brilliant-Belohnungsmoment. Wenn ein Thema „gesichert“ wird, zählen die Punkte hoch und es gibt einen grünen Haken-Morph. Keine Konfetti.
5. **Onboarding-Assistent:** eine Frage pro Bildschirm mit Fortschrittsbalken.
6. **Danach:** Logo-Projekt mit 3 Entwürfen auf Basis von Paket 1.

Jedes Paket durchläuft `npx tsc --noEmit`, `npm run lint`, `npm test` und `npm run check:colors -- --strict`, wird bei 380 und 1440 px im Browser geprüft und geht dann live. Danach werden STATUS und ROADMAP aktualisiert.

## Claudes Entscheidungen (bitte prüfen)

- Sora fällt weg, nur noch Inter.
- Warmes Papier `#F7F7F4` statt kühlem Blaugrau.
- Indigo `#3646D6` bleibt als einziger Akzent. Kein Gold, Belohnung ist Indigo plus Grün.
- Statt Uni-Logos eine Fächer-Reihe.
- Das Duolingo-Onboarding auf der Landing endet im Beta-`mailto` mit vorausgefülltem Fach, weil der Login geschlossen ist.
- Die Suche läuft nur lokal über die geladenen Kurse, ohne neue API.
- Kein Abschnitt „Klausuren“ in der Seitenleiste, solange Trainer-Kurse kein Klausurdatum haben (Builder-Check: Feld existiert nicht in `src/lib/trainer/types.ts`).

## Offen für den Builder

- Die genaue Zuordnung von Fach zu Icon, Kachel-Texte, Mikro-Copy und die Anordnung im Bento-Raster, solange die Prinzipien oben eingehalten werden.
- Wie die Scroll-Sequenz technisch umgesetzt wird, ob mit IntersectionObserver oder CSS `animation-timeline`, jeweils mit Fallback.
