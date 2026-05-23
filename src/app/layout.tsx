import type { Metadata, Viewport } from "next";
import AnalyticsProvider from "@/components/AnalyticsProvider";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://lernly-app.de"),
  applicationName: "Lernly",
  title: {
    default: "Karteikarten aus PDF in 2 Min | Lernly",
    template: "%s | Lernly",
  },
  description:
    "Lade dein Skript hoch und bekomme in 2 Minuten interaktive Karteikarten, einen Klausur-Simulator und einen Essay-Blueprint. Kostenlos starten, kein Login.",
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
    title: "Karteikarten aus PDF in 2 Min | Lernly",
    description:
      "8 PDFs, 3 Tage, kein Plan? Lernly macht aus deinem Skript ein komplettes Lernpaket — Karteikarten, Klausur-Simulator, Essay-Blueprint. Gratis testen.",
    locale: "de_DE",
    images: [
      {
        url: "/lernly-og.png",
        width: 1200,
        height: 630,
        alt: "Lernly — Karteikarten aus PDF in 2 Minuten",
      },
    ],
    type: "website",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "Karteikarten aus PDF in 2 Min | Lernly",
    description:
      "Skript hoch, Karteikarten und Klausur-Simulator runter. In 2 Minuten. Gratis.",
    images: ["/lernly-og.png"],
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
  url: "https://lernly-app.de",
  logo: "https://lernly-app.de/icon.png",
  email: "info@lernly-app.de",
  description:
    "Lernly verwandelt Vorlesungs-PDFs in interaktive Karteikarten, Klausur-Simulatoren und Essay-Blueprints — in unter 2 Minuten.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" className="h-full antialiased">
      <body className="ln-page-bg min-h-full flex flex-col text-[color:var(--color-ln-ink)]">
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <AnalyticsProvider />
        {children}
      </body>
    </html>
  );
}
