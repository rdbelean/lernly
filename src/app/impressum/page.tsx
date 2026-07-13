import type { Metadata } from "next";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import { PROVIDER } from "@/lib/legal/provider";

export const metadata: Metadata = {
  title: "Impressum",
  description: "Impressum und Kontaktdaten von Lernly.",
};

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Lernly", item: "https://www.lernly-app.de" },
    {
      "@type": "ListItem",
      position: 2,
      name: "Impressum",
      item: "https://www.lernly-app.de/impressum",
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
  color: "#ffffff",
  fontWeight: 600,
  fontSize: "20px",
  marginBottom: "10px",
} as const;
const linkStyle = { color: "var(--color-ln-cyan)" } as const;

export default function ImpressumPage() {
  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <ImpressumContent />
    </>
  );
}

function ImpressumContent() {
  return (
    <div className="flex flex-1 flex-col">
      <SiteNav />
      <main className="flex flex-1 flex-col px-6 py-20 md:py-24">
        <div className="mx-auto w-full max-w-[700px]">
          <h1
            className="font-bold leading-[1.05] tracking-[-1.92px] text-white"
            style={{ fontSize: "clamp(32px, 5.5vw, 64px)" }}
          >
            Impressum
          </h1>

          <div className="mt-10">
            <section style={sectionStyle}>
              <h2 style={headingStyle}>Angaben gemäß § 5 TMG</h2>
              <p style={bodyStyle}>
                {PROVIDER.name}
                <br />
                {PROVIDER.street}
                <br />
                {PROVIDER.postal} {PROVIDER.city}
                <br />
                {PROVIDER.country}
              </p>
            </section>

            <section style={sectionStyle}>
              <h2 style={headingStyle}>Kontakt</h2>
              <p style={bodyStyle}>
                Telefon:{" "}
                <a
                  href={`tel:${PROVIDER.phone.replace(/\s+/g, "")}`}
                  style={linkStyle}
                  className="underline-offset-2 hover:underline"
                >
                  {PROVIDER.phone}
                </a>
                <br />
                E-Mail:{" "}
                <a
                  href={`mailto:${PROVIDER.email}`}
                  style={linkStyle}
                  className="underline-offset-2 hover:underline"
                >
                  {PROVIDER.email}
                </a>
              </p>
            </section>

            <section style={sectionStyle}>
              <h2 style={headingStyle}>
                Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV
              </h2>
              <p style={bodyStyle}>
                {PROVIDER.name}
                <br />
                {PROVIDER.street}
                <br />
                {PROVIDER.postal} {PROVIDER.city}
              </p>
            </section>

            <section style={sectionStyle}>
              <h2 style={headingStyle}>Umsatzsteuer</h2>
              <p style={bodyStyle}>
                Gemäß § 19 UStG wird keine Umsatzsteuer berechnet
                (Kleinunternehmerregelung).
              </p>
            </section>

            <section style={sectionStyle}>
              <h2 style={headingStyle}>Streitschlichtung</h2>
              <p style={bodyStyle}>
                Die Europäische Kommission stellt eine Plattform zur
                Online-Streitbeilegung (OS) bereit:{" "}
                <a
                  href="https://ec.europa.eu/consumers/odr/"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={linkStyle}
                  className="underline-offset-2 hover:underline"
                >
                  https://ec.europa.eu/consumers/odr/
                </a>
                . Wir sind nicht bereit oder verpflichtet, an
                Streitbeilegungsverfahren vor einer
                Verbraucherschlichtungsstelle teilzunehmen.
              </p>
            </section>

            <section style={sectionStyle}>
              <h2 style={headingStyle}>Haftung für Inhalte</h2>
              <p style={bodyStyle}>
                Als Diensteanbieter sind wir gemäß § 7 Abs. 1 TMG für eigene
                Inhalte auf diesen Seiten nach den allgemeinen Gesetzen
                verantwortlich. Nach §§ 8 bis 10 TMG sind wir als
                Diensteanbieter jedoch nicht verpflichtet, übermittelte oder
                gespeicherte fremde Informationen zu überwachen oder nach
                Umständen zu forschen, die auf eine rechtswidrige Tätigkeit
                hinweisen.
              </p>
            </section>

            <section style={sectionStyle}>
              <h2 style={headingStyle}>Haftung für Links</h2>
              <p style={bodyStyle}>
                Unser Angebot enthält Links zu externen Webseiten Dritter, auf
                deren Inhalte wir keinen Einfluss haben. Für die Inhalte der
                verlinkten Seiten ist stets der jeweilige Anbieter oder
                Betreiber der Seiten verantwortlich.
              </p>
            </section>

            <section style={sectionStyle}>
              <h2 style={headingStyle}>Urheberrecht</h2>
              <p style={bodyStyle}>
                Die durch den Seitenbetreiber erstellten Inhalte und Werke auf
                diesen Seiten unterliegen dem deutschen Urheberrecht.
                Vervielfältigung, Bearbeitung, Verbreitung und jede Art der
                Verwertung außerhalb der Grenzen des Urheberrechtes bedürfen
                der schriftlichen Zustimmung des jeweiligen Autors bzw.
                Erstellers.
              </p>
            </section>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
