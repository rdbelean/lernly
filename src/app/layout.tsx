import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://lernly-app.de"),
  applicationName: "Lernly",
  title: "Lernly — Upload. Study smart.",
  description:
    "8 PDFs and no plan? Lernly turns your material into a complete study pack in 2 minutes — flashcards, simulator, essay blueprint. Free, no login.",
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
    title: "Lernly — Upload. Study smart.",
    description:
      "8 PDFs and no plan? Get a complete study pack in 2 minutes. Free, no login.",
    images: [
      {
        url: "/lernly-og.png",
        width: 1200,
        height: 630,
        alt: "Lernly — Upload. Study smart.",
      },
    ],
    type: "website",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "Lernly — Upload. Study smart.",
    description: "8 PDFs and no plan? Get a complete study pack in 2 minutes.",
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
    <html lang="en" className="h-full antialiased">
      <body className="ln-page-bg min-h-full flex flex-col text-[color:var(--color-ln-ink)]">
        {children}
      </body>
    </html>
  );
}
