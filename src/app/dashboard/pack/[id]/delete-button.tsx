"use client";

import { useState, useTransition } from "react";
import { deletePack } from "./actions";

export default function DeletePackButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="shrink-0 rounded-full border border-white/15 px-3 py-1.5 text-[13px] text-white/55 transition hover:border-[color:var(--color-ln-rose)]/40 hover:text-white"
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
            await deletePack(id);
          })
        }
        className="rounded-full px-3 py-1.5 text-[13px] font-medium text-white transition disabled:opacity-50"
        style={{
          background: "rgba(217,119,87,0.18)",
          border: "1px solid rgba(217,119,87,0.45)",
        }}
      >
        {pending ? "Lösche…" : "Wirklich löschen"}
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        disabled={pending}
        className="text-[13px] text-white/55 transition hover:text-white"
      >
        Abbrechen
      </button>
    </div>
  );
}
