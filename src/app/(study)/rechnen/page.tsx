import Link from "next/link";
import { X } from "lucide-react";

export const metadata = {
  title: "Rechenaufgaben",
};

export default function RechnenPage() {
  return (
    <main className="mx-auto w-full max-w-[1160px] px-8 py-8 sm:px-12 sm:py-10">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-[0.08em] text-text-dim">
          Aufgabe 1 / 3
        </span>
        <Link
          href="/heute"
          aria-label="Zurück zu Heute"
          className="inline-flex h-9 w-9 items-center justify-center text-text-dim transition-colors hover:text-text"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </Link>
      </div>
    </main>
  );
}
