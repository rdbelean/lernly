import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lernly — Lade hoch. Lerne smart.",
  description:
    "Wirf deine PDFs rein — Lernly baut dir Karteikarten, einen Essay-Blueprint und einen Prüfungssimulator. In Minuten.",
  icons: {
    icon: "/lernly-favicon.svg",
    apple: "/lernly-logo.svg",
  },
  openGraph: {
    title: "Lernly — Lade hoch. Lerne smart.",
    description: "KI-Lernpakete für Studenten. Kostenlos.",
    images: ["/lernly-logo.svg"],
    type: "website",
    url: "https://lernly-app.de",
  },
  twitter: {
    card: "summary",
    title: "Lernly",
    description: "KI-Lernpakete für Studenten.",
    images: ["/lernly-logo.svg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" className="h-full antialiased">
      <body className="ln-page-bg min-h-full flex flex-col text-[color:var(--color-ln-ink)]">
        {children}
      </body>
    </html>
  );
}
