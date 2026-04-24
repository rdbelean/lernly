import type { Metadata } from "next";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Impressum — Lernly",
  description: "Impressum und Kontaktangaben zu Lernly.",
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

export default function ImpressumPage() {
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
                {/* TODO: Namen des Betreibers eintragen */}
                [Name]
                <br />
                {/* TODO: Straße + Hausnummer eintragen */}
                [Straße + Hausnummer]
                <br />
                {/* TODO: PLZ + Ort eintragen */}
                [PLZ + Ort]
                <br />
                [Land]
              </p>
            </section>

            <section style={sectionStyle}>
              <h2 style={headingStyle}>Kontakt</h2>
              <p style={bodyStyle}>
                E-Mail:{" "}
                <a
                  href="mailto:kontakt@lernly-app.de"
                  style={{ color: "var(--color-ln-cyan)" }}
                  className="underline-offset-2 hover:underline"
                >
                  kontakt@lernly-app.de
                </a>
              </p>
            </section>

            <section style={sectionStyle}>
              <h2 style={headingStyle}>
                Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV
              </h2>
              <p style={bodyStyle}>
                {/* TODO: Namen des inhaltlich Verantwortlichen eintragen */}
                [Name]
                <br />
                {/* TODO: Adresse (wie oben) eintragen */}
                [Adresse wie oben]
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
                  style={{ color: "var(--color-ln-cyan)" }}
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
                Unser Angebot enthält Links zu externen Websites Dritter, auf
                deren Inhalte wir keinen Einfluss haben. Für die Inhalte der
                verlinkten Seiten ist stets der jeweilige Anbieter oder
                Betreiber der Seiten verantwortlich.
              </p>
            </section>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
