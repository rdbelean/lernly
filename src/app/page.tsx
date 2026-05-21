import type { Metadata } from "next";
import LandingClient from "./landing-client";

const META_DE = {
  title: "Karteikarten aus PDF in 2 Min | Lernly",
  description:
    "Lade dein Skript hoch und bekomme in 2 Minuten interaktive Karteikarten, einen Klausur-Simulator und einen Essay-Blueprint. Kostenlos starten, kein Login.",
  ogTitle: "Karteikarten aus PDF in 2 Min | Lernly",
  ogDescription:
    "8 PDFs, 3 Tage, kein Plan? Lernly macht aus deinem Skript ein komplettes Lernpaket — Karteikarten, Klausur-Simulator, Essay-Blueprint. Gratis testen.",
  twitterDescription:
    "Skript hoch, Karteikarten und Klausur-Simulator runter. In 2 Minuten. Gratis.",
  locale: "de_DE",
} as const;

const META_EN = {
  title: "Flashcards from PDF in 2 Min | Lernly",
  description:
    "Upload your slides and get interactive flashcards, an exam simulator, and an essay blueprint in 2 minutes. Free, no login.",
  ogTitle: "Flashcards from PDF in 2 Min | Lernly",
  ogDescription:
    "8 PDFs, 3 days, no plan? Lernly turns your material into a complete study pack — flashcards, exam simulator, essay blueprint. Free to try.",
  twitterDescription:
    "Slides in, flashcards and exam simulator out. In 2 minutes. Free.",
  locale: "en_US",
} as const;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}): Promise<Metadata> {
  const { lang } = await searchParams;
  const isEn = lang === "en";
  const m = isEn ? META_EN : META_DE;
  const canonical = isEn ? "/?lang=en" : "/";

  return {
    title: m.title,
    description: m.description,
    alternates: {
      canonical,
      languages: {
        "de-DE": "/",
        "en-US": "/?lang=en",
        "x-default": "/",
      },
    },
    openGraph: {
      title: m.ogTitle,
      description: m.ogDescription,
      locale: m.locale,
      alternateLocale: isEn ? ["de_DE"] : ["en_US"],
      images: [
        {
          url: "/lernly-og.png",
          width: 1200,
          height: 630,
          alt: isEn
            ? "Lernly — Flashcards from PDF in 2 minutes"
            : "Lernly — Karteikarten aus PDF in 2 Minuten",
        },
      ],
      type: "website",
      url: canonical,
    },
    twitter: {
      card: "summary_large_image",
      title: m.ogTitle,
      description: m.twitterDescription,
      images: ["/lernly-og.png"],
    },
  };
}

export default function HomePage() {
  return <LandingClient />;
}
