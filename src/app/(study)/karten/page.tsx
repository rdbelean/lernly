import { FlashcardSession } from "@/components/study/FlashcardSession";

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

  return (
    <main className="flex min-h-screen items-center justify-center">
      <FlashcardSession topicFilter={topicFilter} />
    </main>
  );
}
