import Link from "next/link";
import { X } from "lucide-react";

export const metadata = {
  title: "Karteikarten",
};

export default function KartenPage() {
  return (
    <main className="mx-auto w-full max-w-[1040px] px-8 py-8 sm:px-12 sm:py-10">
      <div className="flex items-center justify-between">
        <Link
          href="/heute"
          aria-label="Zurück zu Heute"
          className="inline-flex h-11 w-11 items-center justify-center rounded-card border border-line bg-surface text-text transition-colors hover:bg-surface-2"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </Link>
        <span className="text-sm font-medium text-text-dim">Karteikarten</span>
      </div>
    </main>
  );
}
