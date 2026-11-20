import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import AnalyticsProvider from "@/components/AnalyticsProvider";
import BetaCheckoutHost from "@/components/beta/BetaCheckoutHost";
import ErrorReporter from "@/components/ErrorReporter";
import { SITE_URL } from "@/lib/site";
import "./globals.css";

// The only typeface (rebrand Richtung 1, Pentagram/Linear principle): Inter
// for headings, UI and body. Weights 400/500/600.
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});


export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: "Lernly",
  title: {
    default: "Dein persönlicher Klausurtrainer | Lernly",
    template: "%s | Lernly",
  },
  description:
    "Aus deinen BWL-Unterlagen wird dein persönlicher Klausurtrainer. Verstehen, üben und wiederholen. Entdecke die interaktive Vorschau.",
  manifest: "/manifest.webmanifest",
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", sizes: "512x512", type: "image/png" },
      { url: "/lernly-favicon.svg", type: "image/svg+xml" },
    ],
    shortcut: "/favicon.ico",
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    title: "Dein persönlicher Klausurtrainer | Lernly",
    description:
      "Dein Stoff. Dein Ich-kann-das. Entdecke Lernly für dein Studium und probiere den Beispieltrainer für Finance, Mathe und Marketing aus.",
    locale: "de_DE",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Lernly – dein persönlicher Klausurtrainer",
      },
    ],
    type: "website",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "Dein persönlicher Klausurtrainer | Lernly",
    description:
      "Verstehen, üben und wiederholen. Dein persönlicher Klausurtrainer für das BWL-Studium.",
    images: ["/opengraph-image"],
  },
  appleWebApp: {
    capable: true,
    title: "Lernly",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "var(--color-work-ink)",
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Lernly",
  url: SITE_URL,
  logo: `${SITE_URL}/icon.png`,
  email: "info@lernly-app.de",
  description:
    "Lernly entwickelt persönliche Klausurtrainer für das Lernen: Erklärungen, aktive Übungen und Karteikarten aus eigenen Kursunterlagen.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="de"
      className={`h-full antialiased ${inter.variable}`}
    >
      <body className="ln-page-bg min-h-full flex flex-col text-[color:var(--color-ln-ink)]">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <AnalyticsProvider />
        <ErrorReporter />
        {children}
        <BetaCheckoutHost />
      </body>
    </html>
  );
}
