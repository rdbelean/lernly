"use client";

import { useState, useTransition } from "react";
import { Pencil } from "lucide-react";
import { renamePack } from "@/app/dashboard/pack/[id]/actions";

const TITLE_STYLE = {
  fontSize: "clamp(20px, 3vw, 30px)",
  color: "var(--color-text)",
  fontFamily: "var(--font-display)",
} as const;

// Inline-rename for the pack title (mirrors ExamCard's edit-in-place): click
// the title → input; Enter/blur saves, Escape cancels. Optimistic, reverts on
// error. Persists via renamePack → study_packs.title.
export default function PackTitle({
  packId,
  initialTitle,
}: {
  packId: string;
  initialTitle: string;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [draft, setDraft] = useState(initialTitle);
  const [editing, setEditing] = useState(false);
  const [, startTransition] = useTransition();

  const save = () => {
    const next = draft.trim();
    setEditing(false);
    if (!next || next === title) {
      setDraft(title);
      return;
    }
    const prev = title;
    setTitle(next);
    startTransition(async () => {
      try {
        await renamePack({ id: packId, title: next });
      } catch {
        setTitle(prev);
        setDraft(prev);
      }
    });
  };

  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === "Enter") save();
          if (e.key === "Escape") {
            setDraft(title);
            setEditing(false);
          }
        }}
        maxLength={120}
        aria-label="Paket umbenennen"
        className="w-full rounded-md border bg-transparent px-1.5 py-0.5 font-semibold leading-tight tracking-[-0.4px] outline-none"
        style={{ ...TITLE_STYLE, borderColor: "var(--color-primary-bright)" }}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        setDraft(title);
        setEditing(true);
      }}
      title="Umbenennen"
      className="group flex w-full items-center gap-2 rounded-md text-left font-semibold leading-tight tracking-[-0.4px] transition"
      style={TITLE_STYLE}
    >
      <span className="min-w-0">{title}</span>
      <Pencil
        size={15}
        strokeWidth={2}
        aria-hidden
        className="shrink-0 opacity-0 transition group-hover:opacity-70"
        style={{ color: "var(--color-text-faint)" }}
      />
    </button>
  );
}
