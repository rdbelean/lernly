# Landing-Hero als ablaufende Lernszene — Kurz-Design

Stand 2026-11-17 · freigegeben von Daniel im Chat („Ja, so abspielen, und die KI-Hilfe auch zeigen“).

**Warum:** Das statische Dashboard-Bild zeigt eine Übersicht, aber nicht, was Lernly kann. Die großen Kacheln wirkten leer.

**Was:** Das Hero-Bild spielt automatisch eine Szene ab (nicht klickbar), ca. 20 s, Schleife:
1. Dashboard („Heute: Discounted Cashflow“, Klausurkarte) · 2. Verstehen („Einfach gesagt“, Formel, typischer Fehler) · 3. Üben (Antwort `751,31` tippt sich selbst, „Genau richtig“) · 4. Merken (Karteikarte dreht sich, Bewertung „Sitzt“) · 5. KI-Hilfe (Frage tippt sich, Antwort baut sich auf) · 6. Karte (Thema wird grün, nächstes Thema „jetzt dran“, Fällig-Zähler sinkt).

**Ziele:** nur Funktionen zeigen, die es gibt; Pause-Taste; `prefers-reduced-motion` = kein Autoplay; Wiedergabe nur sichtbar und bei sichtbarem Tab; keine Layout-Sprünge; 380 px tauglich.
**Nicht-Ziele:** keine Interaktion, keine neuen Abhängigkeiten, keine Copy-Änderung außerhalb des Hero-Bildes.
**Kachel-Beruhigung (auch App):** größtes Gewicht = 2×1 statt 2×2, „jetzt dran“ als helle Kachel mit Primary-Rahmen statt riesiger Vollfläche.
**Annahmen von mir:** Szenenlängen 3–4 s je Szene; Typgeschwindigkeit 45 ms/Zeichen; Beispielinhalte sind als „Beispielkurs“ gekennzeichnet.
