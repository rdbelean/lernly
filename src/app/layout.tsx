import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lernly — Lade hoch. Lerne smart.",
  description:
    "8 PDFs und kein Plan? Lernly macht in 2 Minuten dein komplettes Lernpaket — Karteikarten, Simulator, Essay-Blueprint. Kostenlos, kein Login.",
  icons: {
    icon: "/lernly-favicon.svg",
    apple: "/lernly-logo.svg",
  },
  openGraph: {
    title: "Lernly — Lade hoch. Lerne smart.",
    description:
      "8 PDFs und kein Plan? In 2 Minuten dein komplettes Lernpaket. Kostenlos, kein Login.",
    images: ["/lernly-logo.svg"],
    type: "website",
    url: "https://lernly-app.de",
  },
  twitter: {
    card: "summary",
    title: "Lernly — Lade hoch. Lerne smart.",
    description: "8 PDFs und kein Plan? In 2 Minuten dein komplettes Lernpaket.",
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
