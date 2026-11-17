import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/dal";
import LandingClient from "@/components/landing/LernlyLanding";

const META_DE = {
  title: "BWL-Klausur packen: dein Lerntrainer | Lernly",
  description:
    "Lernly ist für BWL-Klausuren gebaut: Folien und Altklausuren rein, sehen was Punkte bringt, Rechenaufgaben üben und Karteikarten wiederholen. Demo ohne Anmeldung.",
  ogTitle: "Pack deine nächste BWL-Klausur | Lernly",
  ogDescription:
    "Aus deinen Folien und Altklausuren wird dein Lerntrainer für Finance, Mathe und Marketing. Jetzt gratis ausprobieren.",
  twitterDescription:
    "Pack deine nächste BWL-Klausur: lern zuerst, was Punkte bringt. Gratis ausprobieren.",
  locale: "de_DE",
} as const;

const META_EN = {
  title: "Flashcards from PDF in 2 Min | Lernly",
  description:
    "Upload your slides and get interactive flashcards, an exam simulator, and an essay blueprint in 2 minutes. Free, no login.",
  ogTitle: "Flashcards from PDF in 2 Min | Lernly",
  ogDescription:
    "8 PDFs, 3 days, no plan? Lernly turns your material into a complete study pack - flashcards, exam simulator, essay blueprint. Free to try.",
  twitterDescription:
    "Slides in, flashcards and exam simulator out. In 2 minutes. Free.",
  locale: "en_US",
} as const;

export async function generateMetadata(): Promise<Metadata> {
  // EN temporarily disabled - metadata pinned to German. To revive English,
  // restore the ?lang=en handling and the en-US hreflang/alternateLocale below.
  const isEn = false;
  const m = isEn ? META_EN : META_DE;
  const canonical = "/";

  return {
    title: m.title,
    description: m.description,
    alternates: {
      canonical,
    },
    openGraph: {
      title: m.ogTitle,
      description: m.ogDescription,
      locale: m.locale,
      images: [
        {
          url: "/opengraph-image",
          width: 1200,
          height: 630,
          alt: isEn
            ? "Lernly - Flashcards from PDF in 2 minutes"
            : "Lernly – Lerntrainer für BWL-Klausuren",
        },
      ],
      type: "website",
      url: canonical,
    },
    twitter: {
      card: "summary_large_image",
      title: m.ogTitle,
      description: m.twitterDescription,
      images: ["/opengraph-image"],
    },
  };
}

export default async function HomePage() {
  // Logged-in users belong in /dashboard, not on the marketing landing.
  // Quizlet/Notion model: once you sign in, the marketing site is gone.
  const user = await getUser();
  if (user) {
    redirect("/dashboard");
  }
  return <LandingClient />;
}
