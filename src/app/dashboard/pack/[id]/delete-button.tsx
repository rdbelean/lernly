"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { deletePack } from "./actions";

export default function DeletePackButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const router = useRouter();

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="shrink-0 rounded-full border border-[color:var(--color-line)] px-3 py-1.5 text-[13px] text-[color:var(--color-text-faint)] transition hover:border-[color:var(--color-ln-rose)]/40 hover:text-[color:var(--color-text)]"
      >
        Löschen
      </button>
    );
  }

  return (
    <div className="flex shrink-0 items-center gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            try {
              await deletePack(id);
              toast.success("Paket gelöscht");
              router.push("/dashboard");
            } catch (e) {
              toast.error(
                e instanceof Error ? e.message : "Konnte nicht löschen",
              );
            }
          })
        }
        className="rounded-full px-3 py-1.5 text-[13px] font-medium text-white transition disabled:opacity-50"
        style={{
          background: "var(--color-err-bg)",
          border: "1px solid var(--color-err-ink)",
        }}
      >
        {pending ? "Lösche…" : "Wirklich löschen"}
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        disabled={pending}
        className="text-[13px] text-[color:var(--color-text-faint)] transition hover:text-[color:var(--color-text)]"
      >
        Abbrechen
      </button>
    </div>
  );
}
