import type { Metadata } from "next";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Privacy Policy — Lernly",
  description:
    "Lernly privacy policy. What data we collect, why we use it, and which rights you have.",
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
            Privacy Policy
          </h1>

          <div className="mt-10">
            <section style={sectionStyle}>
              <h2 style={headingStyle}>1. Privacy at a glance</h2>
              <h3 style={subHeadingStyle}>General notes</h3>
              <p style={bodyStyle}>
                This privacy policy explains what happens to your personal data
                when you use this website.
              </p>
            </section>

            <section style={sectionStyle}>
              <h2 style={headingStyle}>2. Controller</h2>
              <p style={bodyStyle}>
                {/* TODO: Add controller name */}
                [Name]
                <br />
                {/* TODO: Add address */}
                [Address]
                <br />
                Email:{" "}
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
                3. Data collection on this website
              </h2>
              <h3 style={subHeadingStyle}>How do we collect your data?</h3>
              <p style={bodyStyle}>
                Some data is collected when you provide it to us, for example
                an email address during registration. Other data is collected
                automatically by our IT systems when you visit the website,
                for example browser type, operating system, and time of access.
              </p>
              <h3 style={subHeadingStyle}>What do we use your data for?</h3>
              <ul style={{ ...bodyStyle, paddingLeft: "20px", listStyle: "disc" }}>
                <li>Providing and improving Lernly</li>
                <li>Generating study packs through the Claude API (Anthropic)</li>
                <li>Email communication if you have registered</li>
              </ul>
            </section>

            <section style={sectionStyle}>
              <h2 style={headingStyle}>4. External services</h2>

              <h3 style={subHeadingStyle}>Vercel (Hosting)</h3>
              <p style={bodyStyle}>
                This website is hosted by Vercel Inc. When you visit the site,
                technical information such as IP address and browser type may
                be transmitted to Vercel servers. Privacy policy:{" "}
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
                To generate study packs, your uploaded course material is sent
                to the Claude API (Anthropic, San Francisco, USA). The data is
                used only for processing and is not stored permanently. Privacy
                policy:{" "}
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
                For user accounts and saved study packs, we use Supabase
                (region: Frankfurt, EU). Privacy policy:{" "}
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
              <h2 style={headingStyle}>5. Your rights</h2>
              <p style={bodyStyle}>
                You have the right to access, correct, delete, and restrict
                the processing of your data at any time. To exercise these
                rights, contact:{" "}
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
                Lernly uses only technically necessary session cookies. No
                tracking cookies, no analytics tools, no advertising.
              </p>
            </section>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
