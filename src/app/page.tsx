import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/dal";
import LandingClient from "@/components/landing/LernlyLanding";

const META_DE = {
  title: "Dein persönlicher Klausurtrainer | Lernly",
  description:
    "Verstehe deinen BWL-Stoff und übe aktiv mit Lernly für dein Studium. Entdecke den interaktiven Beispieltrainer für Finance, Mathe und Marketing.",
  ogTitle: "Dein Stoff. Dein Ich-kann-das. | Lernly",
  ogDescription:
    "Aus deinen BWL-Unterlagen wird dein persönlicher Klausurtrainer. Verstehen, üben und wiederholen. Jetzt die Vorschau ausprobieren.",
  twitterDescription:
    "Verstehen, üben und wiederholen. Dein persönlicher Klausurtrainer für dein BWL-Studium.",
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
            : "Lernly – dein persönlicher Klausurtrainer",
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
