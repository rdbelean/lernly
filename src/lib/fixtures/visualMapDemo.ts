import type { z } from "zod";
import type { VisualMapSchema } from "@/lib/schema";

type VisualMap = z.infer<typeof VisualMapSchema>;

export const DEMO_VISUAL_MAP_V2: VisualMap = {
  blocks: [
    {
      title: "Market Entry Modes",
      subtitle: "Topic 1 — HIGHEST EXAM PRIORITY",
      color: "rose",
      icon: "🚪",
      priority: "highest",
      timeMinutes: 45,
      frameworks: [
        {
          kind: "callout",
          tone: "definition",
          title: "Entry Mode",
          body: "Die <strong>institutionelle Vereinbarung</strong>, mit der ein Unternehmen seine Produkte, Technologien oder Ressourcen in einen neuen Markt bringt. Drei Kategorien: Exporting, Contractual, Investment. Steigend in <em>Kontrolle, Kosten und Risiko</em>.",
        },
        {
          kind: "flow",
          title: "Das Entry-Mode-Spektrum",
          boxes: [
            { label: "📤 Exporting", sub: "Niedrigstes Risiko · wenig Kontrolle", accent: "green" },
            { label: "📜 Contractual", sub: "Licensing & Franchising", accent: "amber" },
            { label: "🏗️ Investment (FDI)", sub: "Höchstes Risiko & höchste Kontrolle", accent: "rose" },
          ],
          arrows: "right",
          explanation: "Je weiter rechts, desto mehr Commitment — und desto höher der Erwartungswert bei Erfolg.",
        },
        {
          kind: "comparison",
          title: "Licensing vs Franchising",
          left: {
            label: "Licensing",
            tone: "neutral",
            items: [
              "Rechte an <strong>einzelnem IP</strong> (Patent, Marke, Trade Secret)",
              "Gegen <strong>Royalties</strong> für definierte Periode",
              "Klassisches Anti-Beispiel: Sony nutzte Bell-Labs-Transistor → eigener Marktführer",
            ],
          },
          right: {
            label: "Franchising",
            tone: "neutral",
            items: [
              "Rechte am <strong>kompletten Geschäftssystem</strong> (Brand, Operations, Training)",
              "McDonald's, 7-Eleven (78k Stores in 18 Ländern)",
              "Schwierig zu kontrollieren über tausende Outlets",
            ],
          },
          explanation: "Franchising = Licensing+++ — mehr Standardisierung, mehr Markenrisiko.",
        },
        {
          kind: "concept_grid",
          title: "FDI — vier Spielarten",
          accentEdge: "top",
          cards: [
            { title: "Greenfield", icon: "🌱", body: "Neue Anlage from scratch. Schafft Jobs, oft staatlich incentiviert. <em>Ford in Thailand.</em>", accent: "green" },
            { title: "M&A", icon: "🤝", body: "Bestehendes Unternehmen kaufen. Sofortiger Umsatz — aber kulturelle Integration. <em>Lenovo → IBM PC.</em>", accent: "rose" },
            { title: "Wholly Owned", icon: "💯", body: "100% Ownership. Volle Kontrolle, volles Risiko. <em>BMW in den USA.</em>", accent: "violet" },
            { title: "Equity JV", icon: "🤝", body: "Zwei+ Firmen gründen neue Entity. Manchmal gesetzlich erzwungen. <em>Mexicos Öl-Industrie.</em>", accent: "amber" },
          ],
        },
      ],
    },

    {
      title: "Globalization",
      subtitle: "Topic 2 — Foundation",
      color: "blue",
      icon: "🌐",
      priority: "high",
      timeMinutes: 40,
      frameworks: [
        {
          kind: "callout",
          tone: "definition",
          title: "Globalization",
          body: "Der Trend zu größerer wirtschaftlicher, kultureller und technologischer <strong>Interdependenz</strong>. Charakterisiert durch <strong>Denationalization</strong> — Grenzen werden irrelevanter. Nicht zu verwechseln mit <em>Internationalization</em> (Kooperation über Grenzen).",
        },
        {
          kind: "table",
          title: "Key Terms — know these cold",
          headers: ["Begriff", "Definition"],
          rows: [
            ["<strong>International Business</strong>", "Kommerzielle Transaktion über Grenzen von 2+ Nationen (Enterprise-Level)"],
            ["<strong>International Trade</strong>", "Aggregierte cross-border Flows zwischen Nationen (Makro-Level)"],
            ["<strong>GDP</strong>", "Wert aller Güter & Services einer Volkswirtschaft pro Jahr"],
            ["<strong>GNP</strong>", "GDP + Einkommen aus internationalen Aktivitäten"],
            ["<strong>GDP/GNP per capita</strong>", "Geteilt durch Bevölkerung. Misst Lebensstandard."],
          ],
        },
        {
          kind: "comparison",
          title: "Markets vs Production",
          left: {
            label: "Globalization of Markets",
            tone: "pro",
            items: [
              "<strong>Konvergenz</strong> der Käuferpräferenzen weltweit",
              "Standardisierte Marketing-Kosten ↓",
              "Globale Produkte: iPhone, Netflix, Adidas",
              "Aber: lokale Anpassung nötig (Maharaja Mac in Indien)",
            ],
          },
          right: {
            label: "Globalization of Production",
            tone: "pro",
            items: [
              "<strong>Dispersal</strong> auf optimale Standorte",
              "Zugang zu billigeren Arbeitskräften",
              "Zugang zu Expertise (Indiens Tech-Workforce)",
              "Nippon Seishi besitzt Wälder in 3 Kontinenten",
            ],
          },
        },
        {
          kind: "table",
          title: "Die Globalisierungs-Debatte",
          headers: ["Thema", "Kritiker sagen", "Befürworter sagen"],
          rows: [
            ["Jobs & Wages", "Vernichtet Industrie-Jobs, drückt Löhne", "Erhöht Wohlstand & Effizienz, hebt Schwellenländer"],
            ["Inequality", "Spaltet White-/Blue-Collar in Industrieländern", "China & Indien holen auf; Armut von 36% auf 8% gefallen"],
            ["Culture", "\"Coca-Colanization\" zerstört Vielfalt", "Tiefe Kulturwerte sind resistent; fördert Toleranz"],
            ["Sovereignty", "WTO/IMF überstimmen gewählte Regierungen", "Demokratie hat sich global ausgebreitet"],
          ],
        },
      ],
    },

    {
      title: "Die 4 Risiken der Internationalisierung",
      subtitle: "Topic 3 — HIGH EXAM PRIORITY",
      color: "violet",
      icon: "⚠️",
      priority: "high",
      timeMinutes: 25,
      frameworks: [
        {
          kind: "concept_grid",
          accentEdge: "top",
          cards: [
            { title: "Commercial Risk", icon: "💼", body: "Verlust durch schlechte Strategie/Timing/Pricing. Im Ausland teurer wegen Regulierung — Distributor kann nicht einfach beendet werden.", accent: "rose" },
            { title: "Cross-Cultural Risk", icon: "🌏", body: "Kulturelles Missverständnis. Sprache, Bräuche, Religion. \"Aftertaste\" hat in vielen Sprachen kein 1-Wort-Äquivalent.", accent: "rose" },
            { title: "Country Risk", icon: "🏛️", body: "Politik/Recht/Wirtschaft. Marktzugang, Bürokratie, Income Repatriation. Inkl. IP-Schutz und Inflation.", accent: "amber" },
            { title: "Currency Risk", icon: "💱", body: "Wechselkurs-Schwankungen. Starker USD hat Netflix, IBM, Microsoft, P&G getroffen — MSFT-Revenue −$2.3B.", accent: "amber" },
          ],
        },
        {
          kind: "callout",
          tone: "warning",
          title: "Omnipresent",
          body: "Alle 4 Risiken sind <strong>allgegenwärtig</strong> — Firmen begegnen ihnen an jeder Ecke. Nicht vermeidbar, aber durch Research und proaktives Handeln <em>antizipier- und managebar</em>.",
        },
        {
          kind: "mnemonic",
          title: "Eselsbrücke für die 4 Risiken",
          acronym: "C-C-C-C",
          expansion: [
            { letter: "C", meaning: "Commercial (Strategie/Pricing/Partner)" },
            { letter: "C", meaning: "Cross-cultural (Sprache/Bräuche)" },
            { letter: "C", meaning: "Country (Politik/Recht/Wirtschaft)" },
            { letter: "C", meaning: "Currency (Wechselkurs)" },
          ],
          hook: "Vier C's — wie ein Quartett im Risiko-Orchester. Immer alle vier checken, sonst spielt einer falsch.",
        },
      ],
    },

    {
      title: "Key Players in IB",
      subtitle: "Topic 4 — Moderate",
      color: "green",
      icon: "🏢",
      priority: "moderate",
      timeMinutes: 20,
      frameworks: [
        {
          kind: "flow",
          title: "4 Kategorien der IB-Akteure",
          boxes: [
            { label: "🏭 Focal Firm", sub: "Initiiert die Transaktion", accent: "blue" },
            { label: "📦 Intermediary", sub: "Distribution-Spezialist", accent: "violet" },
            { label: "🔧 Facilitator", sub: "Support-Services", accent: "cyan" },
            { label: "🏛️ Government", sub: "Regulator + SOEs", accent: "amber" },
          ],
          arrows: "right",
        },
        {
          kind: "concept_grid",
          title: "Drei Typen von Focal Firms",
          accentEdge: "left",
          cards: [
            { title: "MNE / MNC", icon: "🏢", body: "Subsidiaries in mehreren Ländern. Walmart: 2.3M Mitarbeiter. ~75.000 MNEs weltweit (1970: 7.500).", accent: "blue" },
            { title: "SMEs", icon: "🏪", body: "<500 Mitarbeiter (US/CA) bzw. <250 (EU). Mehrheit der int. aktiven Firmen! Flexibler, weniger Bürokratie.", accent: "green" },
            { title: "Born Globals", icon: "🚀", body: "Internationalisierung in <3 Jahren ab Gründung. 20+ Länder, 25%+ Auslandsumsatz. Airbnb, Spotify, TikTok.", accent: "rose" },
          ],
        },
      ],
    },

    {
      title: "Country / Political Risk",
      subtitle: "Topic 5 — Quick Win",
      color: "amber",
      icon: "🟠",
      priority: "quick_win",
      timeMinutes: 15,
      frameworks: [
        {
          kind: "callout",
          tone: "insight",
          title: "Das musst du auswendig wissen",
          body: "<strong>Confiscation</strong> · <strong>Expropriation</strong> · <strong>Nationalization</strong> · <strong>Sanctions</strong> · <strong>Embargoes</strong> · <strong>Boycotts</strong> · <strong>Terrorism</strong>. Klassische Klausur-Falle: Confiscation = ohne Entschädigung, Expropriation = mit (möglicherweise inadäquater) Entschädigung.",
        },
        {
          kind: "link_note",
          fromTopic: "Country Risk",
          toTopic: "Entry Modes",
          explanation: "Wenn Country Risk hoch ist, geht man <strong>nicht</strong> mit FDI/Wholly Owned rein — sondern mit Licensing oder JV, um Skin in the Game niedrig zu halten. Direkte Cross-Reference zur Klausur.",
        },
        {
          kind: "formula",
          title: "Faustregel für Entry-Mode-Wahl",
          formula: "Country Risk ↑ + Marktattraktivität ↑ → JV oder Licensing",
          sub: "Wenn beides niedrig: Indirect Exporting. Wenn beides hoch: WOS mit Hedging.",
        },
      ],
    },
  ],
};
