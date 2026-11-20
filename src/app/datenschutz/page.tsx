import type { Metadata } from "next";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import CookieSettingsButton from "@/components/CookieSettingsButton";

export const metadata: Metadata = {
  title: "Datenschutz",
  description:
    "Datenschutzerklärung von Lernly. Welche Daten wir verarbeiten, warum, und welche Rechte du hast.",
};

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Lernly", item: "https://www.lernly-app.de" },
    {
      "@type": "ListItem",
      position: 2,
      name: "Datenschutz",
      item: "https://www.lernly-app.de/datenschutz",
    },
  ],
};

const sectionStyle = { marginBottom: "32px" } as const;
const bodyStyle = {
  color: "var(--color-text-dim)",
  fontSize: "15px",
  lineHeight: 1.7,
} as const;
const headingStyle = {
  color: "var(--color-text)",
  fontWeight: 600,
  fontSize: "22px",
  marginBottom: "12px",
  marginTop: "8px",
} as const;
const subHeadingStyle = {
  color: "var(--color-text)",
  fontWeight: 600,
  fontSize: "17px",
  marginTop: "18px",
  marginBottom: "6px",
} as const;
const linkStyle = { color: "var(--color-primary)" } as const;

export default function DatenschutzPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <DatenschutzContent />
    </>
  );
}

function DatenschutzContent() {
  return (
    <div className="flex flex-1 flex-col">
      <SiteNav />
      <main className="flex flex-1 flex-col px-6 py-20 md:py-24">
        <div className="mx-auto w-full max-w-[700px]">
          <h1
            className="font-bold leading-[1.05] tracking-[-1.92px] text-[color:var(--color-text)]"
            style={{ fontSize: "clamp(32px, 5.5vw, 64px)" }}
          >
            Datenschutzerklärung
          </h1>

          <div className="mt-10">
            <section style={sectionStyle}>
              <h2 style={headingStyle}>1. Datenschutz auf einen Blick</h2>
              <h3 style={subHeadingStyle}>Allgemeine Hinweise</h3>
              <p style={bodyStyle}>
                Diese Datenschutzerklärung klärt dich über die Art, den Umfang
                und den Zweck der Verarbeitung personenbezogener Daten auf
                dieser Website auf. Personenbezogene Daten sind alle Daten,
                mit denen du persönlich identifiziert werden kannst.
              </p>
            </section>

            <section style={sectionStyle}>
              <h2 style={headingStyle}>2. Verantwortlicher</h2>
              <p style={bodyStyle}>
                Verantwortlich im Sinne der Datenschutz-Grundverordnung
                (DSGVO) ist:
              </p>
              <p style={{ ...bodyStyle, marginTop: "12px" }}>
                Rares Daniel Belean
                <br />
                Am Hang 4
                <br />
                69151 Neckargemünd
                <br />
                Deutschland
                <br />
                Telefon:{" "}
                <a
                  href="tel:+4915118164381"
                  style={linkStyle}
                  className="underline-offset-2 hover:underline"
                >
                  +49 151 18164381
                </a>
                <br />
                E-Mail:{" "}
                <a
                  href="mailto:info@lernly-app.de"
                  style={linkStyle}
                  className="underline-offset-2 hover:underline"
                >
                  info@lernly-app.de
                </a>
              </p>
            </section>

            <section style={sectionStyle}>
              <h2 style={headingStyle}>3. Datenerfassung auf dieser Website</h2>
              <h3 style={subHeadingStyle}>Wie erfassen wir deine Daten?</h3>
              <p style={bodyStyle}>
                Manche Daten erheben wir, weil du sie uns mitteilst - zum
                Beispiel deine E-Mail-Adresse bei der Registrierung oder die
                Inhalte, die du hochlädst. Andere Daten werden automatisch
                erfasst, wenn du die Website besuchst - etwa Browsertyp,
                Betriebssystem und Zugriffszeitpunkt.
              </p>
              <h3 style={subHeadingStyle}>Wofür nutzen wir deine Daten?</h3>
              <ul style={{ ...bodyStyle, paddingLeft: "20px", listStyle: "disc" }}>
                <li>Bereitstellung und Verbesserung von Lernly</li>
                <li>
                  Generierung deiner Lernpakete über die Claude API
                  (Anthropic)
                </li>
                <li>E-Mail-Kommunikation, sofern du registriert bist</li>
              </ul>
            </section>

            <section style={sectionStyle}>
              <h2 style={headingStyle}>4. Externe Dienste</h2>

              <h3 style={subHeadingStyle}>Vercel (Hosting)</h3>
              <p style={bodyStyle}>
                Diese Website wird bei Vercel Inc. gehostet. Beim Aufruf der
                Seite werden technische Informationen wie deine IP-Adresse und
                der Browsertyp an Vercel-Server übermittelt. Datenschutz­erklärung:{" "}
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
                Zur Erstellung deiner Lernpakete werden deine hochgeladenen
                Dateien an die Claude API (Anthropic, San Francisco, USA)
                übermittelt. Die Daten werden ausschließlich zur Verarbeitung
                genutzt und nicht dauerhaft gespeichert. Datenschutz­erklärung:{" "}
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

              <h3 style={subHeadingStyle}>Supabase (Datenbank &amp; Authentifizierung)</h3>
              <p style={bodyStyle}>
                Für Nutzerkonten, Sessions und gespeicherte Lernpakete nutzen
                wir Supabase (Region: Frankfurt, EU). Nach dem Login werden
                Session-Cookies auf deinem Gerät gesetzt. Datenschutz­erklärung:{" "}
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

              <h3 style={subHeadingStyle}>Stripe (Zahlungsabwicklung)</h3>
              <p style={bodyStyle}>
                Bei kostenpflichtigen Plänen erfolgt die Zahlungsabwicklung über
                Stripe Payments Europe, Ltd. (Irland). Zahlungsdaten wie
                Kartennummern oder SEPA-Daten werden direkt bei Stripe
                verarbeitet und nicht auf unseren Servern gespeichert.
                Datenschutz­erklärung:{" "}
                <a
                  href="https://stripe.com/de/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={linkStyle}
                  className="underline-offset-2 hover:underline"
                >
                  https://stripe.com/de/privacy
                </a>
              </p>

              <h3 style={subHeadingStyle}>Resend (E-Mail-Versand)</h3>
              <p style={bodyStyle}>
                Für den Versand von Login-Codes, Magic-Links und optionalen
                Klausur-Erinnerungen nutzen wir Resend Inc. Es wird
                ausschließlich deine E-Mail-Adresse sowie der jeweilige
                E-Mail-Inhalt zur Zustellung übermittelt. Datenschutz­erklärung:{" "}
                <a
                  href="https://resend.com/legal/privacy-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={linkStyle}
                  className="underline-offset-2 hover:underline"
                >
                  https://resend.com/legal/privacy-policy
                </a>
              </p>

              <h3 style={subHeadingStyle}>Cloudflare Turnstile (Bot-Schutz)</h3>
              <p style={bodyStyle}>
                Zum Schutz unserer Anmelde- und API-Endpunkte vor
                automatisierten Zugriffen und Missbrauch setzen wir Cloudflare
                Turnstile ein (berechtigtes Interesse nach Art. 6 Abs. 1 lit. f
                DSGVO). Datenschutz­erklärung:{" "}
                <a
                  href="https://www.cloudflare.com/privacypolicy/"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={linkStyle}
                  className="underline-offset-2 hover:underline"
                >
                  https://www.cloudflare.com/privacypolicy/
                </a>
              </p>

              <h3 style={subHeadingStyle}>Sentry (Fehler-Monitoring)</h3>
              <p style={bodyStyle}>
                Zur technischen Fehleranalyse und Stabilität der Anwendung
                verwenden wir Sentry (Functional Software, Inc., berechtigtes
                Interesse nach Art. 6 Abs. 1 lit. f DSGVO). Es werden technische
                Fehlermeldungen erfasst, jedoch keine persönlichen Lerninhalte
                aufgezeichnet. Datenschutz­erklärung:{" "}
                <a
                  href="https://sentry.io/privacy/"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={linkStyle}
                  className="underline-offset-2 hover:underline"
                >
                  https://sentry.io/privacy/
                </a>
              </p>

              <h3 style={subHeadingStyle}>
                PostHog (Optionale Produktanalyse nach Opt-In)
              </h3>
              <p style={bodyStyle}>
                Sofern du im Cookie-Banner ausdrücklich zustimmst (§ 25 Abs. 1
                TDDDG, Art. 6 Abs. 1 lit. a DSGVO), nutzen wir PostHog zur
                anonymisierten Auswertung von Seitenaufrufen und
                Produkt-Meilensteinen, um Lernly zu verbessern. Ohne deine
                Einwilligung wird PostHog nicht initialisiert und es werden
                keine Analyse-Cookies gesetzt. Datenschutz­erklärung:{" "}
                <a
                  href="https://posthog.com/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={linkStyle}
                  className="underline-offset-2 hover:underline"
                >
                  https://posthog.com/privacy
                </a>
              </p>

              <h3 style={subHeadingStyle}>Google Sign-In</h3>
              <p style={bodyStyle}>
                Wenn du dich mit Google anmeldest, werden deine E-Mail-Adresse,
                dein Name und dein Profilbild über den OAuth-Flow von Google
                an uns übermittelt. Diese Daten nutzen wir ausschließlich zur
                Erstellung und Identifikation deines Kontos. Datenschutz­erklärung
                von Google:{" "}
                <a
                  href="https://policies.google.com/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={linkStyle}
                  className="underline-offset-2 hover:underline"
                >
                  https://policies.google.com/privacy
                </a>
              </p>

            </section>

            <section style={sectionStyle}>
              <h2 style={headingStyle}>5. Deine Rechte</h2>
              <p style={bodyStyle}>
                Du hast jederzeit das Recht auf Auskunft (Art. 15 DSGVO),
                Berichtigung (Art. 16 DSGVO), Löschung (Art. 17 DSGVO),
                Einschränkung der Verarbeitung (Art. 18 DSGVO), Datenübertragbarkeit
                (Art. 20 DSGVO) sowie den Widerruf erteilter Einwilligungen
                (Art. 7 Abs. 3 DSGVO). Außerdem hast du das Recht, Beschwerde bei
                einer Datenschutz-Aufsichtsbehörde einzulegen.
              </p>
              <p style={{ ...bodyStyle, marginTop: "10px" }}>
                In deinen{" "}
                <a
                  href="/dashboard/settings"
                  style={linkStyle}
                  className="underline-offset-2 hover:underline"
                >
                  Kontoeinstellungen
                </a>{" "}
                kannst du jederzeit alle deine Daten als JSON exportieren
                („Meine Daten exportieren (JSON)“) oder deinen Account inklusive
                aller Kurse, Klausuren, Uploads und Lernstände sofort
                unwiderruflich entfernen („Account &amp; alle Lerndaten
                endgültig löschen“). Alternativ schreib eine Mail an:{" "}
                <a
                  href="mailto:info@lernly-app.de"
                  style={linkStyle}
                  className="underline-offset-2 hover:underline"
                >
                  info@lernly-app.de
                </a>
              </p>
            </section>

            <section style={sectionStyle}>
              <h2 style={headingStyle}>
                6. Cookies &amp; Einwilligungsverwaltung (§ 25 TDDDG)
              </h2>
              <p style={bodyStyle}>
                Lernly setzt technisch notwendige Session-Cookies (Supabase Auth)
                und speichert deine Datenschutz-Auswahl lokal
                („lernly_consent“), damit Login, Sicherheit und deine
                Cookie-Einstellungen funktionieren (§ 25 Abs. 2 Nr. 2 TDDDG).
                Optionale Analyse-Cookies (PostHog) werden ausschließlich nach
                deiner aktiven Einwilligung im Cookie-Banner gesetzt (§ 25 Abs. 1
                TDDDG). Du kannst deine Auswahl jederzeit mit Wirkung für die
                Zukunft anpassen oder widerrufen:
              </p>
              <p style={{ ...bodyStyle, marginTop: "10px" }}>
                <CookieSettingsButton className="font-semibold underline underline-offset-2 text-[color:var(--color-primary)] hover:opacity-80">
                  Cookie-Einstellungen öffnen
                </CookieSettingsButton>
              </p>
            </section>

            <section style={sectionStyle}>
              <h2 style={headingStyle}>7. Speicherdauer</h2>
              <p style={bodyStyle}>
                Hochgeladene Dateien (PDFs, TXT, MD) werden ausschließlich zur
                Generierung deines Lernpakets verarbeitet und danach gelöscht.
                Generierte Lernpakete werden so lange in deinem Account
                gespeichert, wie du Lernly nutzt. Bei Account-Löschung werden
                alle gespeicherten Pakete sowie dein Profil unwiderruflich
                entfernt.
              </p>
            </section>

            <section style={sectionStyle}>
              <h2 style={headingStyle}>8. Änderungen dieser Erklärung</h2>
              <p style={bodyStyle}>
                Wir behalten uns vor, diese Datenschutzerklärung anzupassen,
                wenn sich rechtliche Vorgaben oder unsere Funktionen ändern.
                Die jeweils aktuelle Fassung findest du immer auf dieser
                Seite.
              </p>
            </section>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
