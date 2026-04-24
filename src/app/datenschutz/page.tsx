import type { Metadata } from "next";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Datenschutzerklärung — Lernly",
  description:
    "Datenschutzerklärung von Lernly. Welche Daten wir erheben, wofür wir sie nutzen und welche Rechte du hast.",
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
  fontSize: "22px",
  marginBottom: "12px",
  marginTop: "8px",
} as const;
const subHeadingStyle = {
  color: "#ffffff",
  fontWeight: 600,
  fontSize: "17px",
  marginTop: "18px",
  marginBottom: "6px",
} as const;
const linkStyle = { color: "var(--color-ln-cyan)" } as const;

export default function DatenschutzPage() {
  return (
    <div className="flex flex-1 flex-col">
      <SiteNav />
      <main className="flex flex-1 flex-col px-6 py-20 md:py-24">
        <div className="mx-auto w-full max-w-[700px]">
          <h1
            className="font-bold leading-[1.05] tracking-[-1.92px] text-white"
            style={{ fontSize: "clamp(32px, 5.5vw, 64px)" }}
          >
            Datenschutzerklärung
          </h1>

          <div className="mt-10">
            <section style={sectionStyle}>
              <h2 style={headingStyle}>1. Datenschutz auf einen Blick</h2>
              <h3 style={subHeadingStyle}>Allgemeine Hinweise</h3>
              <p style={bodyStyle}>
                Diese Datenschutzerklärung gibt Auskunft darüber, was mit
                Ihren personenbezogenen Daten passiert, wenn Sie diese Website
                nutzen.
              </p>
            </section>

            <section style={sectionStyle}>
              <h2 style={headingStyle}>2. Verantwortliche Stelle</h2>
              <p style={bodyStyle}>
                {/* TODO: Namen des Verantwortlichen eintragen */}
                [Name]
                <br />
                {/* TODO: Adresse eintragen */}
                [Adresse]
                <br />
                E-Mail:{" "}
                <a
                  href="mailto:kontakt@lernly-app.de"
                  style={linkStyle}
                  className="underline-offset-2 hover:underline"
                >
                  kontakt@lernly-app.de
                </a>
              </p>
            </section>

            <section style={sectionStyle}>
              <h2 style={headingStyle}>
                3. Datenerfassung auf unserer Website
              </h2>
              <h3 style={subHeadingStyle}>Wie erfassen wir Ihre Daten?</h3>
              <p style={bodyStyle}>
                Ihre Daten werden zum einen dadurch erhoben, dass Sie uns diese
                mitteilen (z.B. E-Mail-Adresse bei der Registrierung). Andere
                Daten werden automatisch beim Besuch der Website durch unsere
                IT-Systeme erfasst (z.B. Browser, Betriebssystem, Zeitpunkt
                des Seitenaufrufs).
              </p>
              <h3 style={subHeadingStyle}>Wofür nutzen wir Ihre Daten?</h3>
              <ul style={{ ...bodyStyle, paddingLeft: "20px", listStyle: "disc" }}>
                <li>Bereitstellung und Verbesserung von Lernly</li>
                <li>Generierung von Lernpaketen über die Claude API (Anthropic)</li>
                <li>E-Mail-Kommunikation, sofern Sie sich registriert haben</li>
              </ul>
            </section>

            <section style={sectionStyle}>
              <h2 style={headingStyle}>4. Externe Dienste</h2>

              <h3 style={subHeadingStyle}>Vercel (Hosting)</h3>
              <p style={bodyStyle}>
                Unsere Website wird bei Vercel Inc. gehostet. Beim Besuch
                werden automatisch Informationen (IP-Adresse, Browsertyp) an
                Vercel-Server übermittelt. Datenschutz:{" "}
                <a
                  href="https://vercel.com/legal/privacy-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={linkStyle}
                  className="underline-offset-2 hover:underline"
                >
                  https://vercel.com/legal/privacy-policy
                </a>
              </p>

              <h3 style={subHeadingStyle}>Anthropic Claude API</h3>
              <p style={bodyStyle}>
                Zur Generierung von Lernpaketen wird Ihr hochgeladenes
                Kursmaterial an die Claude API (Anthropic, San Francisco, USA)
                gesendet. Die Daten werden nur zur Verarbeitung verwendet und
                nicht dauerhaft gespeichert. Datenschutz:{" "}
                <a
                  href="https://www.anthropic.com/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={linkStyle}
                  className="underline-offset-2 hover:underline"
                >
                  https://www.anthropic.com/privacy
                </a>
              </p>

              <h3 style={subHeadingStyle}>Supabase (Datenbank &amp; Auth)</h3>
              <p style={bodyStyle}>
                Für Benutzerkonten und gespeicherte Lernpakete nutzen wir
                Supabase (Region: Frankfurt, EU). Datenschutz:{" "}
                <a
                  href="https://supabase.com/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={linkStyle}
                  className="underline-offset-2 hover:underline"
                >
                  https://supabase.com/privacy
                </a>
              </p>
            </section>

            <section style={sectionStyle}>
              <h2 style={headingStyle}>5. Ihre Rechte</h2>
              <p style={bodyStyle}>
                Sie haben jederzeit das Recht auf Auskunft, Berichtigung,
                Löschung und Einschränkung der Verarbeitung Ihrer Daten.
                Wenden Sie sich dazu an:{" "}
                <a
                  href="mailto:kontakt@lernly-app.de"
                  style={linkStyle}
                  className="underline-offset-2 hover:underline"
                >
                  kontakt@lernly-app.de
                </a>
              </p>
            </section>

            <section style={sectionStyle}>
              <h2 style={headingStyle}>6. Cookies</h2>
              <p style={bodyStyle}>
                Lernly verwendet nur technisch notwendige Session-Cookies.
                Keine Tracking-Cookies, keine Analyse-Tools, keine Werbung.
              </p>
            </section>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
