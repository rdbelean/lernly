import type { Metadata } from "next";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Widerrufsbelehrung",
  description:
    "Widerrufsbelehrung und Widerrufsformular für Verbraucherinnen und Verbraucher von Lernly.",
};

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    {
      "@type": "ListItem",
      position: 1,
      name: "Lernly",
      item: "https://lernly-app.de",
    },
    {
      "@type": "ListItem",
      position: 2,
      name: "Widerrufsbelehrung",
      item: "https://lernly-app.de/widerruf",
    },
  ],
};

const sectionStyle = { marginBottom: "32px" } as const;
const bodyStyle = {
  color: "rgba(255,255,255,0.8)",
  fontSize: "15px",
  lineHeight: 1.7,
} as const;
const headingStyle = {
  color: "white",
  fontFamily: "var(--font-display)",
  fontSize: "22px",
  fontWeight: 600,
  letterSpacing: "-0.4px",
  marginBottom: "12px",
} as const;
const placeholderStyle = {
  background: "rgba(242,163,60,0.08)",
  border: "1px solid rgba(242,163,60,0.25)",
  color: "rgba(255,220,170,0.95)",
  padding: "14px 16px",
  borderRadius: "12px",
  fontSize: "13.5px",
  lineHeight: 1.5,
} as const;

// =========================================================================
// /widerruf — Widerrufsbelehrung scaffold
// =========================================================================
// This page is REQUIRED for any paid B2C service offered to consumers in
// the EU. Structure + routing is in place; the actual legal text must be
// supplied by the operator / a lawyer / a Widerrufsgenerator (e.g.
// e-recht24, IT-Recht-Kanzlei). DO NOT ship to production with these
// TODO placeholders.
// =========================================================================

export default function WiderrufPage() {
  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <SiteNav />
      <main className="px-6 py-16">
        <div className="mx-auto max-w-[720px]">
          <p
            className="mb-3 text-[12px] uppercase tracking-[0.22em]"
            style={{ color: "rgba(255,255,255,0.55)" }}
          >
            Rechtliches
          </p>
          <h1
            className="mb-10 text-white"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "44px",
              fontWeight: 700,
              letterSpacing: "-1.4px",
              lineHeight: 1.05,
            }}
          >
            Widerrufsbelehrung
          </h1>

          <section style={sectionStyle}>
            <h2 style={headingStyle}>Widerrufsrecht</h2>
            <div style={placeholderStyle}>
              TODO: legal text — Standard-Widerrufsbelehrung gemäß § 312g
              i.V.m. § 355 BGB einfügen. Quelle: amtliches Muster aus
              Anlage 1 zu Art. 246a § 1 Abs. 2 EGBGB oder generiert mit
              e-recht24 / IT-Recht-Kanzlei. NICHT selbst formulieren.
            </div>
          </section>

          <section style={sectionStyle}>
            <h2 style={headingStyle}>Folgen des Widerrufs</h2>
            <div style={placeholderStyle}>
              TODO: legal text — Rückzahlungspflicht, Frist (14 Tage),
              Zahlungsmittel. Wenn Lernly innerhalb der Widerrufsfrist
              bereits genutzt wurde: Wertersatz-Regelung erwähnen.
            </div>
          </section>

          <section style={sectionStyle}>
            <h2 style={headingStyle}>Vorzeitiges Erlöschen des Widerrufsrechts</h2>
            <div style={placeholderStyle}>
              TODO: legal text — Hinweis für digitale Inhalte / Dienste,
              dass das Widerrufsrecht erlischt, wenn der Verbraucher der
              vorzeitigen Vertragsausführung ausdrücklich zugestimmt hat
              (§ 356 Abs. 5 BGB). Falls Lernly diesen Verzicht beim
              Checkout abfragt, hier dokumentieren.
            </div>
          </section>

          <section style={sectionStyle}>
            <h2 style={headingStyle}>Muster-Widerrufsformular</h2>
            <div style={placeholderStyle}>
              TODO: legal text — Wortlaut des amtlichen Muster-
              Widerrufsformulars aus Anlage 2 zu Art. 246a § 1 Abs. 2
              EGBGB einfügen, mit Absender-Adresse von Lernly
              (siehe Impressum).
            </div>
          </section>

          <p style={{ ...bodyStyle, fontStyle: "italic" }}>
            Bei Fragen zum Widerruf: siehe Kontaktdaten im{" "}
            <a
              href="/impressum"
              className="underline hover:text-white"
              style={{ color: "rgba(255,255,255,0.85)" }}
            >
              Impressum
            </a>
            .
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
