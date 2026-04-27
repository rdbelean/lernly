import type { Metadata } from "next";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Legal Notice — Lernly",
  description: "Legal notice and contact details for Lernly.",
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
            Legal Notice
          </h1>

          <div className="mt-10">
            <section style={sectionStyle}>
              <h2 style={headingStyle}>Information according to Section 5 TMG</h2>
              <p style={bodyStyle}>
                {/* TODO: Add operator name */}
                [Name]
                <br />
                {/* TODO: Add street and house number */}
                [Street + house number]
                <br />
                {/* TODO: Add postal code and city */}
                [Postal code + city]
                <br />
                [Country]
              </p>
            </section>

            <section style={sectionStyle}>
              <h2 style={headingStyle}>Contact</h2>
              <p style={bodyStyle}>
                Email:{" "}
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
                Responsible for content according to Section 55(2) RStV
              </h2>
              <p style={bodyStyle}>
                {/* TODO: Add content owner name */}
                [Name]
                <br />
                {/* TODO: Add address as above */}
                [Address as above]
              </p>
            </section>

            <section style={sectionStyle}>
              <h2 style={headingStyle}>Dispute resolution</h2>
              <p style={bodyStyle}>
                The European Commission provides a platform for online dispute
                resolution (ODR):{" "}
                <a
                  href="https://ec.europa.eu/consumers/odr/"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "var(--color-ln-cyan)" }}
                  className="underline-offset-2 hover:underline"
                >
                  https://ec.europa.eu/consumers/odr/
                </a>
                . We are not willing or obliged to participate in dispute
                resolution proceedings before a consumer arbitration board.
              </p>
            </section>

            <section style={sectionStyle}>
              <h2 style={headingStyle}>Liability for content</h2>
              <p style={bodyStyle}>
                As a service provider, we are responsible for our own content
                on these pages under general law according to Section 7(1) TMG.
                According to Sections 8 to 10 TMG, however, we are not obliged
                to monitor transmitted or stored third-party information or to
                investigate circumstances that indicate illegal activity.
              </p>
            </section>

            <section style={sectionStyle}>
              <h2 style={headingStyle}>Liability for links</h2>
              <p style={bodyStyle}>
                Our offering contains links to external third-party websites
                over whose content we have no influence. The respective provider
                or operator of the linked pages is always responsible for their
                content.
              </p>
            </section>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
