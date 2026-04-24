import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lernly — Ein Upload. Deine komplette Prüfungsvorbereitung.",
  description:
    "Lade deine Unterlagen hoch, und Lernly baut dir Karteikarten, Essay-Blueprints und einen Lernplan. 3 Lernpakete gratis.",
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
