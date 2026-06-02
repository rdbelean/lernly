"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useDropzone, type FileRejection } from "react-dropzone";
import GenerationProgress from "@/components/GenerationProgress";
import QuotaHitModal, {
  type QuotaHitDetails,
} from "@/components/dashboard/QuotaHitModal";
import { track } from "@/lib/analytics";
import { STUDY_UPLOADS_BUCKET, buildUploadPath } from "@/lib/uploads";
import { MAX_FILE_BYTES, MAX_FILE_MB } from "@/lib/uploadConfig";
import { parseJsonResponse } from "@/lib/safeJson";
import { type ExamType } from "@/lib/schema";
import { Lock } from "lucide-react";
import NewExamForm from "@/components/dashboard/NewExamForm";

type GenerateApiResponse = {
  error?: string;
  reason?: string;
  used?: number;
  limit?: number;
  plan?: string;
  saved?: boolean;
  id?: string;
  pack?: { flashcards?: unknown[]; simulator?: { questions?: unknown[] } };
  warning?: string;
};

const MAX_FILES = 8;
// MAX_FILE_BYTES + MAX_FILE_MB live in @/lib/uploadConfig now — single
// source of truth shared with the server validator and the bucket cap.
const ACCEPTED_MIME = {
  "application/pdf": [".pdf"],
  "text/plain": [".txt"],
  "text/markdown": [".md", ".markdown"],
};

// Feature flag — flip to `true` to ship the Essay format. The enum value,
// the Essay-Blueprint code paths, and the predictions task all stay live;
// only the picker (and a submit guard) gate it.
const ESSAY_ENABLED = false;

// Three formats live here. `oral` and `open_book` stay in the schema enum
// so legacy packs render, but they're gone from the picker — the user can
// only create the three that produce real, distinct practice content.
// Order matters: MC first (and default-selected), Offene Fragen, Essay last.
const EXAM_OPTIONS: {
  value: ExamType;
  title: string;
  description: string;
  emoji: string;
  locked?: boolean;
}[] = [
  {
    value: "multiple_choice",
    title: "Multiple Choice",
    description: "Kniffliges MC-Quiz, das echtes Verstehen testet",
    emoji: "✅",
  },
  {
    value: "open_questions",
    title: "Offene Fragen",
    description: "Offene Fragen mit Musterantworten zum Selbstabfragen",
    emoji: "✍️",
  },
  {
    value: "essay",
    title: "Essay (Klausur)",
    description: "Essay-Baupläne — kommt bald",
    emoji: "📝",
    locked: !ESSAY_ENABLED,
  },
];

function bytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export default function NewPackPage() {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [examType, setExamType] = useState<ExamType>("multiple_choice");
  const [extraInfo, setExtraInfo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [quotaHit, setQuotaHit] = useState<QuotaHitDetails | null>(null);
  const [completed, setCompleted] = useState(false);
  const [mode, setMode] = useState<"single" | "cram">("single");
  const [examChoices, setExamChoices] = useState<
    { id: string; title: string }[]
  >([]);
  const [examId, setExamId] = useState<string | null>(null);
  // When the user picks "+ Neue Klausur anlegen…", we reveal the full
  // NewExamForm (3-path picker + Altklausur upload + hints + fidelity) —
  // same component the dashboard uses, so Path A is reachable from here.
  // Sentinel value "__new__" in the select toggles this.
  const [creatingNewExam, setCreatingNewExam] = useState(false);

  // Load the user's exams so they can assign this pack to one at creation.
  // Pre-select via ?exam=<uuid> if the dashboard deep-linked here.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { createClient } = await import("@/lib/supabase/browser");
        const supabase = createClient();
        const { data } = await supabase
          .from("exams")
          .select("id, title")
          .order("exam_date", { ascending: true, nullsFirst: false });
        if (cancelled) return;
        const rows = (data ?? []) as { id: string; title: string }[];
        setExamChoices(rows);
        const url = new URL(window.location.href);
        const preset = url.searchParams.get("exam");
        if (preset && rows.some((r) => r.id === preset)) setExamId(preset);
      } catch {
        /* ignore — picker just stays empty */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // If the user arrived here from the landing-page login-gate, restore the
  // exam-type they had picked so they don't have to re-pick it.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("lernly-pending-generation");
      if (!raw) return;
      const parsed = JSON.parse(raw) as { examType?: ExamType };
      // Skip restore if the persisted choice points at a currently-locked
      // format (essay while ESSAY_ENABLED is false) — the default holds.
      if (
        parsed.examType &&
        !(parsed.examType === "essay" && !ESSAY_ENABLED)
      ) {
        setExamType(parsed.examType);
      }
      sessionStorage.removeItem("lernly-pending-generation");
    } catch {
      /* ignore */
    }
  }, []);

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
    if (examType === "essay" && !ESSAY_ENABLED) {
      setError("Essay-Format kommt bald — wähl bitte ein anderes.");
      return;
    }
    if (creatingNewExam) {
      setError("Bitte erst die neue Klausur anlegen — klick auf 'Anlegen' oben.");
      return;
    }
    setBusy(true);
    setError(null);
    setCompleted(false);

    const t0 = Date.now();
    try {
      const { createClient } = await import("@/lib/supabase/browser");
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = "/login?next=/dashboard/new";
        return;
      }

      // Klausur was already created (and possibly Altklausur-analysed) by the
      // embedded NewExamForm before this submit ran — examId is set or null.
      const resolvedExamId: string | null = examId;

      // 1) Upload each file straight to Storage — bypasses Vercel's ~4.5 MB
      //    request-body cap so large lecture PDFs go through. Per-file
      //    try/catch so we surface WHICH file + which step actually failed
      //    instead of a generic "Failed to fetch".
      const refs: { path: string; name: string; size: number; type: string }[] =
        [];
      for (const file of files) {
        const path = buildUploadPath(user.id, file.name);
        const sizeMB = (file.size / 1024 / 1024).toFixed(1);
        let upResult;
        try {
          upResult = await supabase.storage
            .from(STUDY_UPLOADS_BUCKET)
            .upload(path, file, {
              contentType: file.type || "application/octet-stream",
              upsert: false,
            });
        } catch (uploadEx) {
          // Network-level failure during the upload call itself (DNS, TLS,
          // connection drop, browser cancel). Distinct from a Storage 4xx/5xx.
          console.error("[upload] network failure", { file: file.name, sizeMB, err: uploadEx });
          throw new Error(
            `Verbindungsproblem beim Hochladen von "${file.name}" (${sizeMB} MB). ` +
              `Bitte erneut versuchen.`,
          );
        }
        if (upResult.error) {
          const err = upResult.error;
          // statusCode lives on the StorageError in supabase-js v2+; falling
          // back to status for older shapes. Include the raw message so the
          // user gets the real reason ("Payload too large", "duplicate", …).
          const errRecord = err as unknown as Record<string, unknown>;
          const rawStatus = errRecord.statusCode ?? errRecord.status;
          const status = typeof rawStatus === "string" || typeof rawStatus === "number"
            ? String(rawStatus)
            : "?";
          console.error("[upload] storage rejected", { file: file.name, sizeMB, status, err });
          const hint =
            status === "413" || /payload too large/i.test(err.message)
              ? ` Tipp: max. ${MAX_FILE_MB} MB pro Datei. Sehr große Vorlesungen besser in Kapitel teilen.`
              : "";
          throw new Error(
            `Upload fehlgeschlagen: "${file.name}" (${sizeMB} MB) — ${err.message} [HTTP ${status}].${hint}`,
          );
        }
        refs.push({ path, name: file.name, size: file.size, type: file.type });
      }

      // 2) Kick off generation with a tiny JSON body (only the storage refs).
      //    Wrap the fetch so a network-level failure (Failed to fetch) is
      //    distinguishable from the API returning a 4xx/5xx response body.
      let res;
      try {
        res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            examType,
            extraInfo: extraInfo.trim() || undefined,
            files: refs,
            examId: resolvedExamId,
          }),
        });
      } catch (fetchEx) {
        console.error("[/api/generate] network failure", fetchEx);
        throw new Error(
          "Verbindung zum Generator-Server fehlgeschlagen — bitte erneut versuchen.",
        );
      }
      const json = await parseJsonResponse<GenerateApiResponse>(res);
      if (!res.ok) {
        if (json.reason === "quota_exceeded" && typeof json.limit === "number") {
          setQuotaHit({
            used: json.used ?? 0,
            limit: json.limit,
            plan: json.plan ?? "free",
          });
          setBusy(false);
          return;
        }
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
        // Surface the truncation warning before the redirect — Sonner toast
        // is rendered by DashboardShell, so the message survives the navigation.
        if (json.warning) {
          const { toast } = await import("sonner");
          toast.warning(json.warning, { duration: 8000 });
        }
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

  const submitCram = async () => {
    if (files.length === 0) {
      setError("Mindestens eine Datei hochladen.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { createClient } = await import("@/lib/supabase/browser");
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = "/login?next=/dashboard/new";
        return;
      }
      const refs: { path: string; name: string }[] = [];
      for (const file of files) {
        const path = buildUploadPath(user.id, file.name);
        const sizeMB = (file.size / 1024 / 1024).toFixed(1);
        let upResult;
        try {
          upResult = await supabase.storage
            .from(STUDY_UPLOADS_BUCKET)
            .upload(path, file, {
              contentType: file.type || "application/octet-stream",
              upsert: false,
            });
        } catch (uploadEx) {
          console.error("[cram upload] network failure", { file: file.name, sizeMB, err: uploadEx });
          throw new Error(
            `Verbindungsproblem beim Hochladen von "${file.name}" (${sizeMB} MB). Bitte erneut versuchen.`,
          );
        }
        if (upResult.error) {
          const err = upResult.error;
          const errRecord = err as unknown as Record<string, unknown>;
          const rawStatus = errRecord.statusCode ?? errRecord.status;
          const status = typeof rawStatus === "string" || typeof rawStatus === "number"
            ? String(rawStatus)
            : "?";
          console.error("[cram upload] storage rejected", { file: file.name, sizeMB, status, err });
          throw new Error(
            `Upload fehlgeschlagen: "${file.name}" (${sizeMB} MB) — ${err.message} [HTTP ${status}].`,
          );
        }
        refs.push({ path, name: file.name });
      }
      const res = await fetch("/api/cram/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          examType,
          extraInfo: extraInfo.trim() || undefined,
          files: refs,
        }),
      });
      const json = await parseJsonResponse<{ jobId?: string; error?: string }>(
        res,
      );
      if (!res.ok || !json.jobId)
        throw new Error(json.error ?? `HTTP ${res.status}`);
      window.location.href = `/dashboard?cram=${json.jobId}`; // → background job
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
            <GenerationProgress
              completed={completed}
              language="de"
              totalBytes={files.reduce((sum, f) => sum + f.size, 0)}
              hasExam={Boolean(examId)}
            />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="px-6 py-12">
      {quotaHit && (
        <QuotaHitModal
          details={quotaHit}
          onClose={() => setQuotaHit(null)}
        />
      )}
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

        <div className="mb-6 flex gap-2">
          <button
            type="button"
            onClick={() => setMode("single")}
            className={`rounded-lg px-4 py-2 text-[14px] font-semibold ${mode === "single" ? "bg-white text-[color:var(--color-ln-bg-bot)]" : "border border-white/15 text-white"}`}
          >
            Ein Paket
          </button>
          <button
            type="button"
            onClick={() => setMode("cram")}
            className={`rounded-lg px-4 py-2 text-[14px] font-semibold ${mode === "cram" ? "bg-white text-[color:var(--color-ln-bg-bot)]" : "border border-white/15 text-white"}`}
          >
            Alles reinwerfen (Cram)
          </button>
        </div>
        {mode === "cram" && (
          <p
            className="mb-4 text-[13px]"
            style={{ color: "rgba(255,255,255,0.6)" }}
          >
            Wirf dein komplettes Klausur-Material rein — wir machen pro Kapitel
            ein Lernpaket. Läuft im Hintergrund; du bekommst Bescheid, wenn
            alles fertig ist.
          </p>
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
            Klausur <span className="lowercase">(optional)</span>
          </h2>
          <select
            value={creatingNewExam ? "__new__" : (examId ?? "")}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "__new__") {
                setCreatingNewExam(true);
                setExamId(null);
              } else {
                setCreatingNewExam(false);
                setExamId(v || null);
              }
            }}
            className="w-full appearance-none rounded-2xl px-4 py-3 text-[14px] text-white outline-none transition focus:border-white/40"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.14)",
            }}
          >
            <option value="">Keine zugeordnet</option>
            {examChoices.map((e) => (
              <option key={e.id} value={e.id}>
                {e.title}
              </option>
            ))}
            <option value="__new__">+ Neue Klausur anlegen…</option>
          </select>

          {creatingNewExam && (
            <div className="mt-3">
              <p
                className="mb-2 text-[12.5px] leading-relaxed"
                style={{ color: "rgba(255,255,255,0.65)" }}
              >
                Hast du eine Altklausur? Lade sie hoch für Fragen im Stil
                deiner echten Prüfung — siehe „Pfad A" unten.
              </p>
              <NewExamForm
                embedded
                onCreated={({ id, title }) => {
                  setExamChoices((prev) => [...prev, { id, title }]);
                  setExamId(id);
                  setCreatingNewExam(false);
                }}
                onCancel={() => {
                  setCreatingNewExam(false);
                  setExamId(null);
                }}
              />
            </div>
          )}
        </section>

        <section className="mt-6">
          <p
            className="mb-3 text-[13px] leading-relaxed"
            style={{ color: "rgba(255,255,255,0.65)" }}
          >
            Jedes Paket enthält{" "}
            <span className="text-white">Karteikarten, Visual Map &amp; Übersicht</span>
            . Wähl dazu deinen Übungsmodus:
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {EXAM_OPTIONS.map((opt) => {
              const active = examType === opt.value && !opt.locked;
              const locked = opt.locked === true;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    if (locked) return;
                    setExamType(opt.value);
                  }}
                  disabled={locked}
                  aria-disabled={locked}
                  className={
                    "relative rounded-2xl px-4 py-4 text-left transition " +
                    (locked ? "cursor-not-allowed" : "")
                  }
                  style={{
                    background: active
                      ? "rgba(111,199,227,0.08)"
                      : "rgba(20, 22, 28, 0.45)",
                    border: `1px solid ${
                      active
                        ? "rgba(111,199,227,0.5)"
                        : "rgba(255,255,255,0.12)"
                    }`,
                    opacity: locked ? 0.55 : 1,
                  }}
                >
                  {locked && (
                    <span
                      className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em]"
                      style={{
                        background: "rgba(255,255,255,0.08)",
                        color: "rgba(255,255,255,0.7)",
                        border: "1px solid rgba(255,255,255,0.14)",
                      }}
                    >
                      Bald verfügbar
                    </span>
                  )}
                  <div className="text-[18px]">
                    {locked ? (
                      <Lock
                        size={18}
                        strokeWidth={1.9}
                        color="var(--color-text-faint)"
                        aria-hidden
                      />
                    ) : (
                      opt.emoji
                    )}
                  </div>
                  <div className="mt-2 text-[14px] font-semibold text-white">
                    {opt.title}
                  </div>
                  <div
                    className="mt-1 text-[12px] leading-snug"
                    style={{ color: "rgba(255,255,255,0.55)" }}
                  >
                    {opt.description}
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
            {files.reduce((sum, f) => sum + f.size, 0) > 15 * 1024 * 1024
              ? "Große Datei — Generierung dauert ~5–10 Minuten. Lass den Tab offen."
              : "Generierung dauert ~1–3 Minuten"}
          </p>
          <button
            type="button"
            onClick={mode === "cram" ? submitCram : submit}
            disabled={files.length === 0}
            className="rounded-full bg-white px-6 py-3 text-[14px] font-medium text-[color:var(--color-ln-bg-bot)] transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {mode === "cram"
              ? "Alles reinwerfen →"
              : "Paket generieren →"}
          </button>
        </div>
      </div>
    </main>
  );
}
