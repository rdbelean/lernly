import type { Metadata } from "next";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import { PROVIDER } from "@/lib/legal/provider";

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
const anbieterBlockStyle = {
  marginTop: "12px",
  marginBottom: "12px",
  paddingLeft: "16px",
  borderLeft: "2px solid rgba(110,128,242,0.45)",
  color: "rgba(255,255,255,0.92)",
} as const;

// =========================================================================
// /widerruf — Widerrufsbelehrung
// =========================================================================
// Wording follows the statutory Muster (Anlage 1 & 2 zu Art. 246a § 1
// Abs. 2 EGBGB). Anbieter-Daten flow from src/lib/legal/provider.ts so
// Impressum and Widerruf can't drift apart. A lawyer must verify the
// final wording matches the Muster verbatim before going live.
// =========================================================================

function AnbieterBlock() {
  return (
    <address style={{ ...bodyStyle, ...anbieterBlockStyle, fontStyle: "normal" }}>
      {PROVIDER.name}
      <br />
      {PROVIDER.street}
      <br />
      {PROVIDER.postal} {PROVIDER.city}
      <br />
      {PROVIDER.country}
      <br />
      E-Mail:{" "}
      <a
        href={`mailto:${PROVIDER.email}`}
        className="underline-offset-2 hover:underline"
        style={{ color: "var(--color-primary-bright)" }}
      >
        {PROVIDER.email}
      </a>
    </address>
  );
}

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
            <p style={bodyStyle}>
              Sie haben das Recht, binnen vierzehn Tagen ohne Angabe von
              Gründen diesen Vertrag zu widerrufen. Die Widerrufsfrist
              beträgt vierzehn Tage ab dem Tag des Vertragsabschlusses.
            </p>
            <p style={{ ...bodyStyle, marginTop: "12px" }}>
              Um Ihr Widerrufsrecht auszuüben, müssen Sie uns
            </p>
            <AnbieterBlock />
            <p style={bodyStyle}>
              mittels einer eindeutigen Erklärung (z. B. ein mit der Post
              versandter Brief oder eine E-Mail) über Ihren Entschluss,
              diesen Vertrag zu widerrufen, informieren. Sie können dafür
              das beigefügte Muster-Widerrufsformular verwenden, das
              jedoch nicht vorgeschrieben ist.
            </p>
            <p style={{ ...bodyStyle, marginTop: "12px" }}>
              Zur Wahrung der Widerrufsfrist reicht es aus, dass Sie die
              Mitteilung über die Ausübung des Widerrufsrechts vor Ablauf
              der Widerrufsfrist absenden.
            </p>
          </section>

          <section style={sectionStyle}>
            <h2 style={headingStyle}>Folgen des Widerrufs</h2>
            <p style={bodyStyle}>
              Wenn Sie diesen Vertrag widerrufen, haben wir Ihnen alle
              Zahlungen, die wir von Ihnen erhalten haben, unverzüglich
              und spätestens binnen vierzehn Tagen ab dem Tag
              zurückzuzahlen, an dem die Mitteilung über Ihren Widerruf
              dieses Vertrags bei uns eingegangen ist. Für diese
              Rückzahlung verwenden wir dasselbe Zahlungsmittel, das Sie
              bei der ursprünglichen Transaktion eingesetzt haben, es sei
              denn, mit Ihnen wurde ausdrücklich etwas anderes
              vereinbart; in keinem Fall werden Ihnen wegen dieser
              Rückzahlung Entgelte berechnet.
            </p>
            <p style={{ ...bodyStyle, marginTop: "12px" }}>
              Haben Sie verlangt, dass die Dienstleistung während der
              Widerrufsfrist beginnen soll, so haben Sie uns einen
              angemessenen Betrag zu zahlen, der dem Anteil der bis zu
              dem Zeitpunkt, zu dem Sie uns von der Ausübung des
              Widerrufsrechts unterrichten, bereits erbrachten
              Dienstleistungen im Vergleich zum Gesamtumfang der im
              Vertrag vorgesehenen Dienstleistungen entspricht.
            </p>
          </section>

          <section style={sectionStyle}>
            <h2 style={headingStyle}>
              Vorzeitiges Erlöschen des Widerrufsrechts
            </h2>
            <p style={bodyStyle}>
              Das Widerrufsrecht erlischt bei einem Vertrag über die
              Bereitstellung von nicht auf einem körperlichen Datenträger
              befindlichen digitalen Inhalten bzw. digitalen
              Dienstleistungen, wenn wir mit der Ausführung des Vertrags
              begonnen haben, nachdem Sie
            </p>
            <ol
              style={{
                ...bodyStyle,
                marginTop: "12px",
                paddingLeft: "20px",
                listStyleType: "decimal",
              }}
            >
              <li style={{ marginBottom: "8px" }}>
                ausdrücklich zugestimmt haben, dass wir mit der Ausführung
                vor Ablauf der Widerrufsfrist beginnen, und
              </li>
              <li>
                Ihre Kenntnis davon bestätigt haben, dass Sie durch Ihre
                Zustimmung mit Beginn der Ausführung Ihr Widerrufsrecht
                verlieren (§ 356 Abs. 5 BGB).
              </li>
            </ol>
            {/* PRODUCT NOTE — keep visible to whoever maintains checkout.
                Diese Zustimmung + Bestätigung muss beim Checkout aktiv
                eingeholt werden (z. B. Pflicht-Checkbox), sonst greift
                das Erlöschen nicht. Mit Anwalt abstimmen. */}
            <p
              style={{
                marginTop: "16px",
                padding: "12px 14px",
                background: "rgba(242,163,60,0.08)",
                border: "1px solid rgba(242,163,60,0.25)",
                borderRadius: "10px",
                color: "rgba(255,220,170,0.92)",
                fontSize: "13px",
                lineHeight: 1.55,
                fontStyle: "italic",
              }}
            >
              » Hinweis (Produkt): Diese Zustimmung + Bestätigung muss
              beim Checkout aktiv eingeholt werden (z. B.
              Pflicht-Checkbox), sonst greift das Erlöschen nicht. Mit
              Anwalt abstimmen.
            </p>
          </section>

          <section style={sectionStyle}>
            <h2 style={headingStyle}>Muster-Widerrufsformular</h2>
            <p style={{ ...bodyStyle, fontStyle: "italic" }}>
              (Wenn Sie den Vertrag widerrufen wollen, können Sie dieses
              Formular ausfüllen und an uns zurücksenden.)
            </p>
            <p style={{ ...bodyStyle, marginTop: "12px" }}>An</p>
            <AnbieterBlock />
            <p style={bodyStyle}>
              Hiermit widerrufe(n) ich/wir (*) den von mir/uns (*)
              abgeschlossenen Vertrag über die Erbringung der folgenden
              Dienstleistung:
            </p>
            <ul
              style={{
                ...bodyStyle,
                marginTop: "12px",
                paddingLeft: "20px",
                listStyleType: "none",
              }}
            >
              <li style={{ marginBottom: "6px" }}>— Bestellt am (*)</li>
              <li style={{ marginBottom: "6px" }}>
                — Name des/der Verbraucher(s)
              </li>
              <li style={{ marginBottom: "6px" }}>
                — Anschrift des/der Verbraucher(s)
              </li>
              <li style={{ marginBottom: "6px" }}>— Datum</li>
              <li>
                — Unterschrift des/der Verbraucher(s) (nur bei Mitteilung
                auf Papier)
              </li>
            </ul>
            <p
              style={{
                ...bodyStyle,
                marginTop: "12px",
                color: "rgba(255,255,255,0.6)",
                fontSize: "13.5px",
              }}
            >
              (*) Unzutreffendes streichen.
            </p>
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
