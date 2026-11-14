# Helle Lernly-Landingpage: Referenzanalyse und Umsetzung

Referenz: https://alytics.framer.website/ — direkt im Browser untersucht am 14. November 2026.

**Gemessene Gestaltung der Referenz.**

| Element | Beobachtung am Desktop |
|---|---|
| Schrift | Inter, nicht Sora |
| Hauptüberschrift | 64 px, Gewicht 500, Zeilenhöhe 76,8 px, Zeichenabstand −3,2 px |
| Abschnittsüberschrift | 48 px, Gewicht 500, Zeilenhöhe 57,6 px, Zeichenabstand −2,4 px |
| Kartentitel | 24 px, Gewicht 500, Zeichenabstand −0,96 px |
| Navigation | Inter 16 px, Gewicht 500, Zeilenhöhe 22,4 px |
| Hintergrund | RGB 252/252/252 |
| Überschriftenfarbe | RGB 18/18/18 |
| Hero | Zentrierte Überschrift, kurze Beschreibung, kompakter CTA, vier seitliche Logo-Kacheln |
| Logo-Kacheln | Rund 84–104 px große, leicht gedrehte helle Quadrate, viel Abstand zum Text |
| Produktvorschau | Große helle Dashboard-Fläche unter dem Hero mit weichem blauem Schatten |
| Integrationen | Große helle, abgerundete Fläche, zentrale Botschaft und außen verteilte Logos |

**Übertragung auf Lernly.**

- Die Landingpage erhält eine eigene, lokal begrenzte helle Farbwelt. Das Dashboard und andere App-Seiten behalten ihre bisherigen Stile.
- Inter wird über die schon vorhandene Schriftintegration verwendet. Die Display-Schrift Sora wird auf dieser Landingpage nicht mehr benutzt.
- Lernly-Indigo bleibt die Akzentfarbe für Buttons, ausgewählte Texte und den Trainer. Das spezifische Blau der Referenz wird nicht zur neuen Lernly-Markenfarbe.
- Vier schwebende Kacheln zeigen Claude, Quizlet, Anki und Lernly im Hero. Eine weitere Logo-Zeile erklärt die Rollen der Werkzeuge.
- Der Lernökosystem-Bereich greift die außen platzierten Kacheln und die zentrierte Botschaft auf.
- Die aktive Lerntrainer-Vorschau mit Finance-, Mathe- und Marketing-Beispielen bleibt erhalten. Die Referenz-Dashboardgrafiken werden nicht übernommen.
- Keine erfundenen Kundenlogos, Nutzerzahlen, Testimonials oder Bewertungen. Werkzeuglogos sind als solche dargestellt.
- Anki und Quizlet werden als Kartenexportziele beschrieben. Die Darstellung behauptet keine bereits vorhandene Fortschrittssynchronisierung.
- Mobile erhält eine eigene Anordnung ohne schwebende Hero-Kacheln über dem Text. Die Marken erscheinen weiter in der Logo-Zeile und im Lernökosystem-Bereich.
- Die dezente Logo-Bewegung respektiert die Systemeinstellung für reduzierte Animationen.

**Asset-Herkunft.** Claude stammt als SVG aus dem offiziellen Webauftritt. Quizlet und Anki stammen als 512-Pixel-App-Icons aus den jeweiligen offiziellen App-Store-Einträgen. Dateien und Quellen stehen in [public/brands/SOURCES.md](/Users/rdb/lernly/public/brands/SOURCES.md). Lernly verwendet weiterhin die vorhandenen eigenen SVG-Markenassets.

**Betroffene Dateien.** Die Umsetzung liegt in [LernlyLanding.tsx](/Users/rdb/lernly/src/components/landing/LernlyLanding.tsx) und dem zugehörigen [CSS-Modul](/Users/rdb/lernly/src/components/landing/lernly-landing.module.css). Auch die [Social-Linkvorschau](/Users/rdb/lernly/src/app/opengraph-image.tsx) folgt der hellen Farbwelt.

**Prüfung:** Produktions-Build und TypeScript erfolgreich. Im Browser Inter und 64-Pixel-Hero bestätigt; Original-Logos geladen, Aufgabenprüfung erfolgreich, mobiles Menü geprüft. Bei 380 CSS-Pixeln kein horizontaler Überlauf. Die Browser-Konsole zeigte keine Fehler.
