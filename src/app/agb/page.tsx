import type { Metadata } from "next";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "AGB",
  description:
    "Allgemeine Geschäftsbedingungen für die Nutzung von Lernly.",
};

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Lernly", item: "https://www.lernly-app.de" },
    {
      "@type": "ListItem",
      position: 2,
      name: "AGB",
      item: "https://www.lernly-app.de/agb",
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
  fontSize: "22px",
  marginBottom: "12px",
  marginTop: "8px",
} as const;
const linkStyle = { color: "var(--color-ln-cyan)" } as const;

export default function AgbPage() {
  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <AgbContent />
    </>
  );
}

function AgbContent() {
  return (
    <div className="flex flex-1 flex-col">
      <SiteNav />
      <main className="flex flex-1 flex-col px-6 py-20 md:py-24">
        <div className="mx-auto w-full max-w-[700px]">
          <h1
            className="font-bold leading-[1.05] tracking-[-1.92px] text-white"
            style={{ fontSize: "clamp(32px, 5.5vw, 64px)" }}
          >
            AGB
          </h1>
          <p
            className="mt-3 text-[14px]"
            style={{ color: "rgba(255,255,255,0.55)" }}
          >
            Allgemeine Geschäftsbedingungen - Stand:{" "}
            {new Date().toLocaleDateString("de-DE", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
          </p>

          <div className="mt-10">
            <section style={sectionStyle}>
              <h2 style={headingStyle}>1. Geltungsbereich</h2>
              <p style={bodyStyle}>
                Diese Allgemeinen Geschäftsbedingungen (AGB) regeln die
                Nutzung der Webseite und des Dienstes Lernly (im Folgenden
                „Lernly"), betrieben von Rares Daniel Belean, Am Hang 4,
                69151 Neckargemünd. Mit der Nutzung von Lernly erklärst du
                dich mit diesen AGB einverstanden.
              </p>
            </section>

            <section style={sectionStyle}>
              <h2 style={headingStyle}>2. Leistungen</h2>
              <p style={bodyStyle}>
                Lernly bietet eine browserbasierte Software, die hochgeladene
                Lerninhalte (PDF, TXT, Markdown) automatisiert in
                interaktive Lernpakete umwandelt - bestehend aus
                Karteikarten, Klausur-Simulator, Essay-Blueprint und
                Themen-Übersicht. Die Erstellung erfolgt über die Anthropic
                Claude API.
              </p>
            </section>

            <section style={sectionStyle}>
              <h2 style={headingStyle}>3. Pflichten der Nutzer</h2>
              <p style={bodyStyle}>
                Du bestätigst, dass du die nötigen Rechte besitzt, die von
                dir hochgeladenen Inhalte zu verwenden, oder dass die
                Nutzung im Rahmen der privaten Nutzung (§ 53 UrhG) erfolgt.
                Lernly speichert hochgeladene Originaldateien nicht
                dauerhaft, sondern verarbeitet sie nur für die Generierung
                deines Lernpakets.
              </p>
            </section>

            <section style={sectionStyle}>
              <h2 style={headingStyle}>4. Konto und Login</h2>
              <p style={bodyStyle}>
                Für die Speicherung deiner Lernpakete ist ein kostenloser
                Account nötig. Anmeldung erfolgt per Google Sign-In oder
                Magic-Link an deine E-Mail-Adresse. Du bist für die
                Sicherheit deines Zugangs selbst verantwortlich.
              </p>
            </section>

            <section style={sectionStyle}>
              <h2 style={headingStyle}>5. Preise und Bezahlung</h2>
              <p style={bodyStyle}>
                Der Gratis-Tarif (0 €) erlaubt die Erstellung von zwei
                Lernpaketen pro Monat. Einzelklausur (4,99 €, einmalig) bietet
                5 Lernpakete mit 14 Tagen Zugang. Monatlich (8,99 €/Monat,
                50 Lernpakete pro Monat) und Semester (29,99 € für 6 Monate,
                60 Lernpakete pro Monat) sind kostenpflichtige Abos. Alle Preise
                sind Endpreise - gemäß § 19 UStG wird keine Umsatzsteuer
                berechnet (Kleinunternehmerregelung). Die Bezahlung erfolgt über
                Stripe; Abos verlängern sich automatisch zum Ende der laufenden
                Periode (Semester alle sechs Monate, Monatlich monatlich) und
                sind jederzeit zum Periodenende kündbar.
              </p>
            </section>

            <section style={sectionStyle}>
              <h2 style={headingStyle}>6. Founder-Pricing</h2>
              <p style={bodyStyle}>
                Solange Lernly unter 1.000 zahlende Nutzer hat, gelten die
                unter Ziffer 5 gelisteten Preise als Gründerpreise und bleiben
                für früh abgeschlossene Abos gelockt. Übersteigt die Zahl der
                zahlenden Nutzer diese Grenze, können für ab diesem Zeitpunkt
                neu abgeschlossene Abos angepasste Preise gelten. Bereits
                bestehende Abos behalten den ursprünglich vereinbarten Preis.
              </p>
            </section>

            <section style={sectionStyle}>
              <h2 style={headingStyle}>7. 30-Tage-Geld-zurück-Garantie</h2>
              <p style={bodyStyle}>
                Innerhalb der ersten 30 Tage nach Abo-Abschluss kannst du
                eine vollständige Rückerstattung anfordern. Eine kurze
                E-Mail an{" "}
                <a
                  href="mailto:info@lernly-app.de"
                  style={linkStyle}
                  className="underline-offset-2 hover:underline"
                >
                  info@lernly-app.de
                </a>{" "}
                reicht. Die Erstattung erfolgt über den ursprünglichen
                Zahlungsweg, in der Regel innerhalb von sieben Werktagen.
                Die Garantie gilt einmalig pro Nutzer und nicht bei
                missbräuchlicher Inanspruchnahme.
              </p>
            </section>

            <section style={sectionStyle}>
              <h2 style={headingStyle}>8. Widerrufsrecht</h2>
              <p style={bodyStyle}>
                Als Verbraucher hast du das Recht, binnen vierzehn Tagen
                ohne Angabe von Gründen den Vertrag zu widerrufen. Die
                Widerrufsfrist beträgt vierzehn Tage ab dem Tag des
                Vertragsabschlusses. Um dein Widerrufsrecht auszuüben,
                schick uns eine eindeutige Erklärung (z. B. per E-Mail an{" "}
                <a
                  href="mailto:info@lernly-app.de"
                  style={linkStyle}
                  className="underline-offset-2 hover:underline"
                >
                  info@lernly-app.de
                </a>
                ) über deinen Entschluss, den Vertrag zu widerrufen.
              </p>
            </section>

            <section style={sectionStyle}>
              <h2 style={headingStyle}>9. Verfügbarkeit</h2>
              <p style={bodyStyle}>
                Wir bemühen uns um maximale Verfügbarkeit von Lernly,
                können diese jedoch nicht garantieren. Wartungsarbeiten,
                Ausfälle der Anthropic API oder anderer Drittanbieter
                können temporäre Einschränkungen verursachen.
              </p>
            </section>

            <section style={sectionStyle}>
              <h2 style={headingStyle}>10. Haftung</h2>
              <p style={bodyStyle}>
                Wir haften nur für Schäden aus Verletzung wesentlicher
                Vertragspflichten und im Übrigen bei Vorsatz und grober
                Fahrlässigkeit. Die durch Lernly generierten Inhalte sind
                Lernhilfen und keine geprüften wissenschaftlichen
                Ausarbeitungen - die inhaltliche Verantwortung für deine
                Klausur, Hausarbeit oder Prüfung liegt bei dir.
              </p>
            </section>

            <section style={sectionStyle}>
              <h2 style={headingStyle}>11. Schlussbestimmungen</h2>
              <p style={bodyStyle}>
                Es gilt deutsches Recht. Sollten einzelne Bestimmungen
                dieser AGB unwirksam sein, bleibt die Wirksamkeit der
                übrigen Bestimmungen unberührt.
              </p>
            </section>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
