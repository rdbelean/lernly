import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://lernly-app.de"),
  applicationName: "Lernly",
  title: "Lernly — Lade hoch. Lerne smart.",
  description:
    "8 PDFs und kein Plan? Lernly macht in 2 Minuten dein komplettes Lernpaket — Karteikarten, Simulator, Essay-Blueprint. Kostenlos, kein Login.",
  manifest: "/manifest.webmanifest",
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
    title: "Lernly — Lade hoch. Lerne smart.",
    description:
      "8 PDFs und kein Plan? In 2 Minuten dein komplettes Lernpaket. Kostenlos, kein Login.",
    images: [
      {
        url: "/lernly-og.png",
        width: 1200,
        height: 630,
        alt: "Lernly — Lade hoch. Lerne smart.",
      },
    ],
    type: "website",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "Lernly — Lade hoch. Lerne smart.",
    description: "8 PDFs und kein Plan? In 2 Minuten dein komplettes Lernpaket.",
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
