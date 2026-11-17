import { FlashcardSession } from "@/components/study/FlashcardSession";
import { CORPORATE_FINANCE_FLASHCARDS } from "@/lib/study/seed";

export const metadata = {
  title: "Karteikarten",
};

export default async function KartenPage({
  searchParams,
}: {
  searchParams: Promise<{ topic?: string | string[] }>;
}) {
  const params = await searchParams;
  const topicFilter = Array.isArray(params.topic)
    ? params.topic[0]
    : params.topic;

  const filtered = topicFilter
    ? CORPORATE_FINANCE_FLASHCARDS.filter((card) => card.topicId === topicFilter)
    : CORPORATE_FINANCE_FLASHCARDS;

  const cards = filtered.length > 0 ? filtered : CORPORATE_FINANCE_FLASHCARDS;

  return (
    <main className="flex min-h-screen items-center justify-center">
      <FlashcardSession cards={cards} />
    </main>
  );
}
