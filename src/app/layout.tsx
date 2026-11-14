import type { Metadata, Viewport } from "next";
import { Inter, Sora } from "next/font/google";
import AnalyticsProvider from "@/components/AnalyticsProvider";
import BetaCheckoutHost from "@/components/beta/BetaCheckoutHost";
import ErrorReporter from "@/components/ErrorReporter";
import { SITE_URL } from "@/lib/site";
import "./globals.css";

// Body / UI typeface. Inter at the standard set of weights we use across
// nav, buttons, body text, captions.
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

// Display / heading typeface. Sora - geometric humanist, calmer than the
// system-stack we had. Weight 600 is the primary heading weight per spec.
const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: "Lernly",
  title: {
    default: "Dein persönlicher Klausurtrainer mit Claude | Lernly",
    template: "%s | Lernly",
  },
  description:
    "Aus deinen BWL-Unterlagen wird dein persönlicher Klausurtrainer. Mit Claude verstehen. Mit Lernly üben. Entdecke die interaktive Vorschau.",
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
    title: "Dein persönlicher Klausurtrainer mit Claude | Lernly",
    description:
      "Dein Stoff. Dein Ich-kann-das. Entdecke Lernly für Claude und probiere den Beispieltrainer für Finance, Mathe und Marketing aus.",
    locale: "de_DE",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Lernly – dein persönlicher Klausurtrainer mit Claude",
      },
    ],
    type: "website",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "Dein persönlicher Klausurtrainer mit Claude | Lernly",
    description:
      "Mit Claude verstehen. Mit Lernly üben. Dein persönlicher Klausurtrainer für das BWL-Studium.",
    images: ["/opengraph-image"],
  },
  appleWebApp: {
    capable: true,
    title: "Lernly",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#1421C5",
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Lernly",
  url: SITE_URL,
  logo: `${SITE_URL}/icon.png`,
  email: "info@lernly-app.de",
  description:
    "Lernly entwickelt persönliche Klausurtrainer für das Lernen mit Claude: Erklärungen, aktive Übungen und Karteikarten aus eigenen Kursunterlagen.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="de"
      className={`h-full antialiased ${inter.variable} ${sora.variable}`}
    >
      <body className="ln-page-bg min-h-full flex flex-col text-[color:var(--color-ln-ink)]">
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
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
