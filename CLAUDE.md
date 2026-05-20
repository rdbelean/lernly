# LERNLY — Komplettes Projekt-Briefing
## Dieses Dokument enthält ALLES über Lernly. Für neuen Claude-Chat / Claude-Projekt als Kontext nutzen.

---

# 1. WAS IST LERNLY?

Lernly ist ein KI-gestütztes SaaS-Tool für Studenten. Der Student lädt sein Kursmaterial hoch (PDFs, Slides, Skripte) und bekommt in unter 2 Minuten ein komplettes, interaktives Lernpaket:

- **Interaktive Karteikarten** — Flip-Animation, 3-stufiges Rating (😕/🤔/✅), Shuffle, Kategorie-Filter, Fortschrittsbalken, "nur falsche wiederholen"
- **Prüfungssimulator** — Szenario-basierte MC-Fragen, sofortiges grün/rot Feedback mit Erklärung warum JEDE Option richtig/falsch ist, Score-Tracking
- **Essay-Blueprint** — Absatz-für-Absatz-Struktur mit Template-Sätzen, Accordion-Sections, interaktive Checkliste, Zeitplanung
- **Konzept-Übersicht** — Themen gruppiert, Prüfungsrelevanz pro Konzept (high/med/low), Autor-Referenzen

**Website:** lernly-app.de
**GitHub:** github.com/rdbelean/lernly (neues Repo, squashed single commit)
**Altes Projekt (Kids-Version):** github.com/rdbelean/lernly-kids (geparkt)

---

# 2. ORIGIN STORY

Lernly entstand aus einer echten Situation: Ein Austauschstudent (ADHD, visueller Lerner) saß 4 Tage vor einer 4-Stunden Essay-Prüfung über "Scandinavian Leadership" vor einem Berg ungelesener PDFs. Im Chat mit Claude Opus wurden interaktive HTML-Lerntools gebaut (Flashcards, Simulator, Blueprint, Study Hub) die so gut funktionierten, dass der Student die Prüfung bestanden hat. Die Idee: diese Methode als SaaS-Produkt für alle Studenten verfügbar machen.

---

# 3. ZIELGRUPPE & PERSONA

**Primäre Persona: "Der überforderte Student"**
- 19-27 Jahre, Uni-Student (Bachelor/Master), DACH + Austauschstudenten in Europa
- Prokrastiniert bis kurz vor der Prüfung (1-14 Tage, meist unter 7)
- Sitzt vor 8 PDFs und weiß NICHT wo anfangen — das ist das Kernproblem
- Hat ChatGPT probiert → nur Textwände → nutzlos
- Lernt visuell, kurze Aufmerksamkeitsspanne, oft ADHS
- Budget: knapp (5-15€/mo für Tools)
- Digital native, auf TikTok, Instagram, Reddit, Discord

---

# 4. DIE 7 CORE PAIN POINTS

1. **"Ich weiß nicht wo ich anfangen soll"** — 8 PDFs, 0 Plan. DER größte Pain Point.
2. **"Ich lerne passiv und es bleibt nichts hängen"** — lesen/markieren = Illusion von Lernen. Active Recall = 80% Retention, aber niemand macht es freiwillig.
3. **"ChatGPT gibt mir eine Textwand"** — Information ≠ Lernsystem. Eine Zusammenfassung ist NOCH eine Textwand.
4. **"Karteikarten schreiben dauert ewig"** — 45 Min für 12 Karten. Die effektivste Methode ist die aufwändigste.
5. **"Ich weiß nicht was prüfungsrelevant ist"** — 400 Slides, was kommt dran?
6. **"Ich weiß nicht wie ich meinen Essay strukturieren soll"** — welcher Satz wo? Wie lang?
7. **"Ich bin Austauschstudent und alles ist doppelt schwer"** — fremdes System, fremde Sprache

---

# 5. TECH STACK

- **Frontend:** Next.js 14+ (App Router), Tailwind CSS
- **AI:** Anthropic Claude API (claude-sonnet-4-20250514), System-Prompt in src/lib/prompts.ts
- **Database:** Supabase (Auth + DB), Schema erstellt aber noch nicht verdrahtet
- **Hosting:** Vercel
- **Domain:** lernly-app.de (GoDaddy DNS → Vercel)
- **File Upload:** react-dropzone
- **Validation:** Zod schemas in src/lib/schema.ts

---

# 6. AKTUELLE CODE-ARCHITEKTUR

Aktuell ist fast alles in einer einzigen `src/app/page.tsx` (2000+ Zeilen). Das wurde als Problem identifiziert und ein Refactoring ist geplant:

### Geplante Ziel-Struktur:
```
src/
├── app/
│   ├── page.tsx              (nur Layout + Imports)
│   ├── layout.tsx
│   ├── impressum/page.tsx    (bereits erstellt)
│   ├── datenschutz/page.tsx  (bereits erstellt)
│   └── api/
│       └── generate/
│           └── route.ts      (Server-only: Claude API Call, JSON Parsing)
├── components/
│   ├── landing/
│   │   ├── Navbar.tsx
│   │   ├── Hero.tsx          (H1 + Subtitle + CTAs + Cycling Hero Card)
│   │   ├── HeroCard.tsx      (3 cycling slides: Flashcard, Blueprint, Quiz preview)
│   │   ├── ShowcaseCards.tsx  (3 Fach-Cards: BWL, MED, JURA)
│   │   ├── BentoGrid.tsx     (6 Feature Cards + 0€ Card)
│   │   ├── Pipeline.tsx      (3 Steps mit CSS cycling animation)
│   │   ├── Pricing.tsx       (3 Tiers + BYOK Banner)
│   │   ├── FAQ.tsx           (5 Accordion items)
│   │   ├── BottomCTA.tsx
│   │   └── Footer.tsx
│   ├── upload/
│   │   ├── FileDropzone.tsx
│   │   └── ExamSelector.tsx
│   └── pack/
│       ├── FlashcardDeck.tsx  (flip, rating, progress, shuffle, replay)
│       ├── ExamSimulator.tsx  (scenarios, MC, feedback, score)
│       ├── EssayBlueprint.tsx (accordion, templates, checklist)
│       ├── OverviewTab.tsx    (topics, concepts, exam-relevance)
│       └── ResultSection.tsx  (tabbed hub switching between above)
├── lib/
│   ├── prompts.ts            (System Prompts mit Qualitätsregeln)
│   ├── schema.ts             (Zod Schemas inkl. examRelevance)
│   ├── supabase.ts           (Browser + Service-Role Client)
│   └── parseFiles.ts         (PDF/TXT Parsing)
└── styles/globals.css
```

### Was bereits existiert und funktioniert (in page.tsx):
- FlashcardDeck (line ~1237) — flip, rating, progress, replay
- EssayBlueprintView (line ~1399) — accordion, templates, checklist
- ExamSimulator (line ~1494) — scenarios, options, feedback, score
- OverviewTab (line ~1496) — topics, concepts, examRelevance
- ResultSection (line ~1166) — tabbed hub (Karteikarten | Übersicht | Blueprint | Simulator)
- Landing page sections (Hero, Showcase, Bento, Pipeline, Pricing, FAQ, Footer)

### Was FEHLT / noch nicht funktioniert:
- Supabase Auth (Magic Link) + User Dashboard
- Stripe Integration für Pro/Team
- Shuffle + Kategorie-Filter auf Flashcards
- Mobile Responsive Testing
- Rate Limiting auf API Route
- Input Validation (Dateigröße, MIME Types)
- HTML Export ist basic (renderPackAsHtml) — fehlt Interaktivität

---

# 7. SUPABASE SCHEMA (erstellt, nicht verdrahtet)

```sql
-- users table (extends auth.users)
CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'team')),
  packs_used_this_month INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- study_packs table
CREATE TABLE public.study_packs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id),
  title TEXT,
  exam_type TEXT,
  pack_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- auto-create user profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

Env vars needed: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY

---

# 8. SYSTEM PROMPT (src/lib/prompts.ts)

Bereits eingebaut und verbessert:
- **Sprachregel:** Output in gleicher Sprache wie Input-Material
- **Flashcard-Regeln:** 25+ Cards, 3-5 Kategorien, Schwierigkeitsgrade (40% easy, 40% med, 20% hard), Antworten mit Autor/Quelle
- **Simulator-Regeln:** 10+ Anwendungsfragen, jede falsche Option erklären, plausible Distraktoren
- **Blueprint-Regeln:** konkrete Referenzen, Template-Sätze mit [Lücken], Zeitplanung, Checkliste
- **Overview-Regeln:** nach Themen gruppiert, examRelevance Feld (jetzt im Zod Schema)
- **max_tokens:** 16000 (erhöht von 10000)
- **JSON-Forcing:** "Starte DIREKT mit {, keine Erklärungen, kein Markdown"
- **JSON-Parsing:** Robusteres Parsing das Backticks entfernt, trailing commas fixt, 2. Versuch bei Fehler

---

# 9. DESIGN SYSTEM

### Gradient Background:
```css
background: linear-gradient(180deg, #4A6CF7 0%, #2E45B8 35%, #1B2670 65%, #0F1535 100%);
background-attachment: fixed;
```

### Fonts (System-Fonts, keine Google Fonts):
```css
--font-display: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", sans-serif;
--font-mono: ui-monospace, "SF Mono", Menlo, monospace;
```

### Glassmorphism Cards:
```css
background: rgba(0, 0, 0, 0); /* transparent */
border: 1px solid rgba(255, 255, 255, 0.22); /* erhöht für Sichtbarkeit */
border-radius: 28px;
padding: 36px 32px;
backdrop-filter: blur(24px);
```

### Hero Card:
```css
background: rgba(20, 22, 28, 0.78);
border-radius: 22px;
padding: 30px 34px;
backdrop-filter: blur(8px);
box-shadow: rgba(0, 0, 0, 0.6) 0 24px 60px;
```

### Typography:
- H1: 96px, weight 700, rgba(255,255,255,0.75), letter-spacing -2.88px
- H1 hat Zwei-Ton-Effekt: "Lade hoch." (gedämpft 0.7) + "Lerne smart." (voll weiß)
- H2: 64px, weight 700
- Section Labels: 13px, weight 500, uppercase, letter-spacing 2.86px, color rgba(255,255,255,0.55)
- Body text: rgba(255,255,255,0.6) (erhöht für Lesbarkeit)

### Gradient Text für Stats:
```css
/* "~120" */
font-size: 64px; font-weight: 700;
background: linear-gradient(135deg, #6FC7E3, #7FA9F5);
-webkit-background-clip: text; -webkit-text-fill-color: transparent;

/* "0€" */
font-size: 120px; font-weight: 800;
background: linear-gradient(135deg, #6FC7E3, #B29CF0);
-webkit-background-clip: text; -webkit-text-fill-color: transparent;
```

### Buttons:
- Primary: white bg, dark text, border-radius: 999px (pill), padding 14px 28px
- Secondary: transparent bg, rgba(255,255,255,0.08), border rgba(255,255,255,0.12), pill
- Claude verbinden: Terracotta gradient rgba(217,119,87,0.15), border rgba(217,119,87,0.35), color #D97757

### Pipeline Animation (rein CSS, kein JS):
```css
@keyframes stage-activate {
  0%, 3% { border-color: var(--hairline); box-shadow: none; transform: translateY(0); }
  8%, 22% { border-color: rgb(var(--stage-color)); box-shadow: 0 0 0 1px rgb(var(--stage-color)), 0 14px 40px -12px rgb(var(--stage-color) / 0.6); transform: translateY(-3px); }
  28%, 100% { border-color: var(--hairline); box-shadow: none; transform: translateY(0); }
}
/* 3 Steps mit animation-delay: 0s, -4s, -2s — cycling durch negative delays */
```

### Hero Card Cycling:
- 3 Slides (Flashcard preview, Blueprint preview, Quiz preview) mit position: absolute
- Animation: slide-cycle 18s ease-in-out infinite
- Delays: 0s, -12s, -6s für smooth crossfade

---

# 10. AKTUELLE SEITENSTRUKTUR (lernly-app.de)

1. **Nav** (sticky, glassmorphism) — Logo + Features + So geht's + "Claude verbinden" (Terracotta link) + "Paket erstellen →" (pill button)
2. **Hero** — H1 "Lade hoch. Lerne smart." (zwei-ton) + Subtitle "8 PDFs. 3 Tage. Kein Plan." + Buttons + Cycling Hero Card (3 slides)
3. **Badges** — "2 Min" · "Kein Login" · "3 Pakete gratis" · "Jedes Fach" · "Kostenlos"
4. **Showcase Cards** — "Vor deinem Stoffberg" + 3 Fach-Cards (BWL, MED, JURA) mit grünem Dot, Badge, Wellenform
5. **Bento Grid** — "Warum Lernly" + 6 Feature Cards + 0€ Full-Width Card
6. **Pipeline** — 3 Steps mit CSS cycling animation + Pfeilen
7. **Pricing** — 3 Tiers (Gratis/Pro/Team) + BYOK Banner darunter
8. **FAQ** — 5 Accordion Items (noch einzubauen laut Audit)
9. **Bottom CTA** — "Die Prüfung wartet nicht."
10. **Footer** — Logo + Impressum + Datenschutz + LinkedIn

---

# 11. PRICING-MODELL

### Kosten pro Generierung: ~$0.17 (0.16€)

| Plan | Preis | Pakete | AI-Kosten | Marge |
|------|-------|--------|-----------|-------|
| Gratis | 0€ | 3 total | 0.48€ | -0.48€ (Akquise) |
| Pro | 6.99€/mo | 20/mo | 3.20€ | **3.79€** |
| Team | 14.99€/mo | 50/mo | 8.00€ | **6.99€** |
| Pro+BYOK | 4.99€/mo | Unlimited | 0€ | **4.99€** (höchste!) |
| Team+BYOK | 9.99€/mo | Unlimited | 0€ | **9.99€** (höchste!) |

### BYOK-Strategie:
- BYOK = Bring Your Own Key (Anthropic API Key)
- Ist ein **RABATT-MODIFIER** auf bestehende Pläne, KEIN eigener Tier
- Wird als dezenter **Banner UNTER den 3 Pricing-Cards** gezeigt
- "30% günstiger + unbegrenzte Pakete wenn du deinen Key verbindest"
- BYOK-User sind die PROFITABELSTEN (0€ AI-Kosten = pure Marge)
- Claude Pro/Max Abo kann NICHT verbunden werden — nur API Keys
- In der Nav: "Claude verbinden" als dezenter Terracotta-Link (scrollt zum Banner)
- Beim Klick: Modal mit Key-Eingabefeld + Link zu console.anthropic.com

---

# 12. WEBSITE AUDIT — WAS NOCH FEHLT

### 🔴 MUST-HAVE:
1. **Social Proof** — "Getestet an der Uppsala Universität" oder ähnlich. Aktuell: NULL Social Proof.
2. **"So sieht dein Lernpaket aus" Section** — User sieht nie ein echtes Ergebnis. Mockups von Flashcard-UI, Simulator, Blueprint.
3. **FAQ Section** — 5 Accordion Items (Was passiert mit Dateien? Welche Formate? Besser als ChatGPT? etc.)
4. **Mobile Responsive** — 80% kommen via Handy (Instagram, WhatsApp Links)
5. **Bottom CTA emotionaler** — aktuell zu rational

### 🟡 SHOULD-HAVE:
6. Bento H2 ersetzen (zu generisch: "Alles was du brauchst")
7. Pipeline H2 nicht duplizieren (zu ähnlich wie Hero H1)
8. "gebaut mit Claude" entfernen/umformulieren (Studenten kennen Claude nicht)
9. CTA nach Pipeline Section (User liest 3 Schritte → kein Button → verloren)
10. Instagram/TikTok statt LinkedIn im Footer

### 🟢 NICE-TO-HAVE:
11. Wiederholungen reduzieren ("2 Minuten" steht 5x)
12. Vergleich mit Alternativen (ChatGPT, Quizlet)
13. Pro-Card visuell prominenter machen

---

# 13. LOGO

- Quadratisches App-Icon: Indigo-Gradient (#4A6CF7→#2845B8) + weiße Text-Linien + goldener Sparkle-Stern (#FFD76E→#F0A830)
- 3 SVG-Versionen: 512x512 (Haupt), 32x32 (Nav), 16x16 (Favicon)
- Eingebunden: Favicon, Nav (Icon + "Lernly" Text), Footer, Loading Screen (pulsierend), OpenGraph
- GPT-5.5 Logo-Prompt erstellt für alternatives Design (LOGO_PROMPT_GPT.txt)

---

# 14. 4 SPEZIALISIERTE AGENTEN-PROMPTS

Vollständige Prompts sind in LERNLY_AGENT_PROMPTS.md:

1. **Copywriter** — Website-Copy, Ads, E-Mails. Kennt alle 7 Pain Points. Stil: direkt, empathisch, duzen, deutsch.
2. **SEO-Stratege** — DACH Keywords, Long-tail Fokus, Content-Kalender, Technical SEO. Weiß dass Domain Rating ~0 ist.
3. **Marketing/Growth** — Go-to-Market mit Bootstrap-Budget (<500€/mo), TikTok/Reddit/Discord, Referral-System, Prüfungsphasen-Timing.
4. **Produkt-Stratege** — Feature-Priorisierung, Sprint-Planung, kennt den aktuellen Stack und was fehlt.

---

# 15. DOMAIN-STRATEGIE

- **lernly-app.de** = Hauptseite (Studenten-SaaS) — die neue Landing Page
- **lernly-app.de/kids** = Coming Soon (Kids-Version, später)
- GoDaddy DNS → Vercel (neues Vercel-Projekt)
- Altes Vercel-Projekt von Domain getrennt
- Coming-Soon Banner für Kids geplant (E-Mail Warteliste)

---

# 16. LINKEDIN DESCRIPTIONS (erstellt)

**Personal Profile Headline:**
"Building Lernly — AI-powered study packs for students | Upload your PDFs, ace your exam"

**Company Page Tagline:**
"Upload your course material. Get a complete study pack. In 2 minutes."

(Vollständige Texte wurden im Chat erstellt)

---

# 17. ALLE ERSTELLTEN DATEIEN

| Datei | Beschreibung |
|-------|-------------|
| LERNLY_COMPLETE_ANALYSIS.md | Persona, Pain Points, Positioning, Wettbewerb, Conversion Funnel |
| LERNLY_AGENT_PROMPTS.md | 4 spezialisierte Agent-Prompts (Copy, SEO, Marketing, Produkt) |
| PRICING_ANALYSIS_Lernly.md | Detaillierte Pricing-Analyse mit BYOK-Integration |
| WEBSITE_AUDIT_Lernly.md | Komplette Website-Analyse + 11 priorisierte Verbesserungen |
| QUALITY_PLAN_Lernly.md | Plan für Output-Qualitäts-Verbesserung |
| DEPLOY_Lernly.md | Vercel + Supabase + Domain Setup Anleitung |
| DIFF_Lernly_vs_Ora.md | Visueller Vergleich Lernly vs Ora + 10 CSS Fixes |
| HERO_VISUAL_ANIMATION_Lernly.md | Cycling Hero Card Animation mit CSS |
| PIPELINE_ANIMATION_Lernly.md | Stage-Activate CSS Animation (exakte Ora-Werte) |
| FIX_JSON_AND_LOADING_Lernly.md | JSON Parsing Fix + Loading Progress Bar |
| BUILD_MISSING_SECTIONS.md | Showcase + Pipeline Sektionen |
| LOGO_PROMPT_GPT.txt | GPT-5.5 Logo-Generierungs-Prompt |
| lernly-logo.svg / lernly-icon-nav.svg / lernly-favicon.svg | Logo SVGs |
| LERNLY_COMPLETE_CHAT_SUMMARY.txt | Vorherige Chat-Zusammenfassung |

---

# 18. DESIGN-ENTSCHEIDUNGEN (final)

| Entscheidung | Ergebnis |
|-------------|----------|
| Background | Indigo→Deep-Blue→Navy Gradient (NICHT flat-schwarz, NICHT Ora-cyan) |
| H1 Effekt | Zwei-Ton: erster Teil gedämpft (0.75), zweiter Teil voll weiß |
| Buttons | Pill-shape (border-radius: 999px) |
| BYOK | Banner UNTER Pricing-Cards, NICHT als eigene Card |
| Claude verbinden | Dezenter Terracotta Nav-Link, NICHT Hero-Button |
| Footer | Impressum + Datenschutz + LinkedIn (Instagram geplant) |
| Source Code | Eigener Code inspiriert von Ora's Design-Werten — KEIN kopierter Code |
| Hero Subtitle | "8 PDFs. 3 Tage. Kein Plan." (kurz, eine Zeile) |
| Primary CTA | "Paket erstellen →" (gleich in Nav und Hero) |

---

# 19. NÄCHSTE SCHRITTE (priorisiert)

### Phase 1 — Sofort (macht die größten Unterschiede):
- [ ] Website Audit Änderungen umsetzen (Social Proof, FAQ, "So sieht's aus" Section)
- [ ] Code Refactoring (page.tsx → Komponenten)
- [ ] Rate Limiting + Input Validation
- [ ] Mobile Responsive testen und fixen

### Phase 2 — Bald (Monetarisierung):
- [ ] Supabase Auth (Magic Link) + Dashboard (/dashboard mit gespeicherten Paketen)
- [ ] Stripe Integration für Pro/Team
- [ ] BYOK Flow (Key eingeben, in Supabase speichern, bei Generierung nutzen)

### Phase 3 — Wachstum:
- [ ] Multi-Pass Generation für Premium (2 API-Calls: erst analysieren, dann generieren)
- [ ] Quizlet Export
- [ ] Referral System ("Teile Lernly → 3 Extra-Pakete")
- [ ] Instagram/TikTok Content-Strategie starten
- [ ] Blog für SEO (Long-tail Keywords)

### Phase 4 — Later:
- [ ] /kids Coming Soon Page
- [ ] Lernplan-Generator
- [ ] Fortschritts-Tracking über Sessions
- [ ] Browser Extension
