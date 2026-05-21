"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useDropzone, type FileRejection } from "react-dropzone";
import GenerationProgress from "@/components/GenerationProgress";
import { track } from "@/lib/analytics";
import {
  EXAM_TYPE_LABELS,
  type ExamType,
} from "@/lib/schema";

const MAX_FILES = 8;
const MAX_FILE_BYTES = 25 * 1024 * 1024; // 25 MB
const ACCEPTED_MIME = {
  "application/pdf": [".pdf"],
  "text/plain": [".txt"],
  "text/markdown": [".md", ".markdown"],
};

const EXAM_OPTIONS: { value: ExamType; emoji: string; sub: string }[] = [
  { value: "essay", emoji: "📝", sub: "Geschriebener Aufsatz" },
  { value: "multiple_choice", emoji: "✅", sub: "MC-Klausur" },
  { value: "oral", emoji: "🗣", sub: "Mündliche Prüfung" },
  { value: "open_book", emoji: "📋", sub: "Take-Home / Open Book" },
];

function bytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export default function NewPackPage() {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [examType, setExamType] = useState<ExamType>("essay");
  const [extraInfo, setExtraInfo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [completed, setCompleted] = useState(false);

  const onDrop = useCallback(
    (accepted: File[], rejected: FileRejection[]) => {
      setError(null);
      if (rejected.length > 0) {
        const first = rejected[0];
        const reason = first.errors[0]?.message ?? "Datei abgelehnt";
        setError(`${first.file.name}: ${reason}`);
      }
      setFiles((prev) => {
        const next = [...prev];
        for (const f of accepted) {
          if (next.length >= MAX_FILES) break;
          if (!next.some((x) => x.name === f.name && x.size === f.size)) {
            next.push(f);
          }
        }
        return next;
      });
    },
    [],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_MIME,
    maxSize: MAX_FILE_BYTES,
    maxFiles: MAX_FILES,
    disabled: busy,
  });

  const removeFile = (name: string) =>
    setFiles((prev) => prev.filter((f) => f.name !== name));

  const submit = async () => {
    if (files.length === 0) {
      setError("Mindestens eine Datei hochladen.");
      return;
    }
    setBusy(true);
    setError(null);
    setCompleted(false);

    const fd = new FormData();
    fd.set("examType", examType);
    if (extraInfo.trim()) fd.set("extraInfo", extraInfo.trim());
    for (const file of files) fd.append("files", file);

    const t0 = Date.now();
    try {
      const res = await fetch("/api/generate", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error ?? `HTTP ${res.status}`);
      }
      track("auth_generate_completed", {
        duration_ms: Date.now() - t0,
        cards: json.pack?.flashcards?.length,
        quiz: json.pack?.simulator?.questions?.length,
        exam_type: examType,
        file_count: files.length,
      });
      setCompleted(true);
      if (json.saved && json.id) {
        // small delay so the user sees completion tick
        setTimeout(() => router.push(`/dashboard/pack/${json.id}`), 500);
      } else {
        throw new Error(
          "Pack wurde generiert, konnte aber nicht gespeichert werden.",
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unbekannter Fehler");
      setBusy(false);
    }
  };

  if (busy) {
    return (
      <main className="px-6 py-16">
        <div className="mx-auto max-w-[640px]">
          <div
            className="rounded-[28px] p-10"
            style={{
              background: "rgba(20, 22, 28, 0.78)",
              border: "1px solid rgba(255, 255, 255, 0.18)",
              backdropFilter: "blur(24px)",
            }}
          >
            <GenerationProgress completed={completed} language="de" />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="px-6 py-12">
      <div className="mx-auto max-w-[720px]">
        <a
          href="/dashboard"
          className="text-[13px] transition hover:text-white"
          style={{ color: "rgba(255,255,255,0.55)" }}
        >
          ← Dashboard
        </a>

        <p
          className="mt-6 mb-3 text-[12px] uppercase tracking-[0.22em]"
          style={{ color: "rgba(255,255,255,0.55)" }}
        >
          Neues Lernpaket
        </p>
        <h1
          className="mb-10 text-white"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "44px",
            fontWeight: 700,
            letterSpacing: "-1.4px",
            lineHeight: 1.05,
          }}
        >
          Material hochladen
        </h1>

        {error && (
          <div
            className="mb-6 rounded-2xl p-4 text-[14px]"
            style={{
              background: "rgba(217, 119, 87, 0.12)",
              border: "1px solid rgba(217, 119, 87, 0.35)",
              color: "#E8A88D",
            }}
          >
            {error}
          </div>
        )}

        <section
          className="rounded-2xl p-6"
          style={{
            background: "rgba(20, 22, 28, 0.55)",
            border: "1px solid rgba(255,255,255,0.14)",
            backdropFilter: "blur(20px)",
          }}
        >
          <div
            {...getRootProps()}
            className="cursor-pointer rounded-2xl px-6 py-12 text-center transition"
            style={{
              border: `1px dashed ${
                isDragActive ? "rgba(111,199,227,0.7)" : "rgba(255,255,255,0.22)"
              }`,
              background: isDragActive ? "rgba(111,199,227,0.06)" : "transparent",
            }}
          >
            <input {...getInputProps()} />
            <div className="text-[44px]">📂</div>
            <p className="mt-3 text-[16px] font-medium text-white">
              {isDragActive
                ? "Loslassen zum Hinzufügen"
                : "PDFs, TXT oder MD hierher ziehen"}
            </p>
            <p
              className="mt-1 text-[13px]"
              style={{ color: "rgba(255,255,255,0.5)" }}
            >
              oder klicken zum Auswählen · max. {MAX_FILES} Dateien ·{" "}
              {bytes(MAX_FILE_BYTES)} pro Datei
            </p>
          </div>

          {files.length > 0 && (
            <ul className="mt-4 space-y-2">
              {files.map((f) => (
                <li
                  key={f.name}
                  className="flex items-center justify-between rounded-xl px-4 py-3 text-[13px]"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-white">{f.name}</div>
                    <div
                      className="text-[11px]"
                      style={{ color: "rgba(255,255,255,0.5)" }}
                    >
                      {bytes(f.size)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFile(f.name)}
                    className="ml-3 text-white/50 transition hover:text-white"
                    aria-label={`${f.name} entfernen`}
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-6">
          <h2
            className="mb-3 text-[12px] uppercase tracking-[0.22em]"
            style={{ color: "rgba(255,255,255,0.55)" }}
          >
            Prüfungsformat
          </h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {EXAM_OPTIONS.map((opt) => {
              const active = examType === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setExamType(opt.value)}
                  className="rounded-2xl px-4 py-4 text-left transition"
                  style={{
                    background: active
                      ? "rgba(111,199,227,0.08)"
                      : "rgba(20, 22, 28, 0.45)",
                    border: `1px solid ${
                      active
                        ? "rgba(111,199,227,0.5)"
                        : "rgba(255,255,255,0.12)"
                    }`,
                  }}
                >
                  <div className="text-[20px]">{opt.emoji}</div>
                  <div className="mt-2 text-[14px] font-medium text-white">
                    {EXAM_TYPE_LABELS[opt.value]}
                  </div>
                  <div
                    className="text-[11px]"
                    style={{ color: "rgba(255,255,255,0.5)" }}
                  >
                    {opt.sub}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="mt-6">
          <h2
            className="mb-3 text-[12px] uppercase tracking-[0.22em]"
            style={{ color: "rgba(255,255,255,0.55)" }}
          >
            Zusatzinfos <span className="lowercase">(optional)</span>
          </h2>
          <textarea
            value={extraInfo}
            onChange={(e) => setExtraInfo(e.target.value)}
            rows={3}
            placeholder="z.B. Klausur dauert 90 min, Fokus liegt auf Kapitel 3–5, deutsche Sprache."
            className="w-full rounded-2xl px-4 py-3 text-[14px] text-white outline-none transition focus:border-white/40"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.14)",
            }}
          />
        </section>

        <div className="mt-8 flex items-center justify-between gap-4">
          <p
            className="text-[12px]"
            style={{ color: "rgba(255,255,255,0.45)" }}
          >
            Generierung dauert ~30–60 Sekunden
          </p>
          <button
            type="button"
            onClick={submit}
            disabled={files.length === 0}
            className="rounded-full bg-white px-6 py-3 text-[14px] font-medium text-[color:var(--color-ln-bg-bot)] transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Paket generieren →
          </button>
        </div>
      </div>
    </main>
  );
}
