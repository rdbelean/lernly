"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDropzone, type FileRejection } from "react-dropzone";
import GenerationProgress from "@/components/GenerationProgress";
import QuotaHitModal, {
  type QuotaHitDetails,
} from "@/components/dashboard/QuotaHitModal";
import { track } from "@/lib/analytics";
import { STUDY_UPLOADS_BUCKET, buildUploadPath } from "@/lib/uploads";
import {
  MAX_FILE_BYTES,
  MAX_FILE_MB,
  MAX_PAST_EXAM_FILES,
} from "@/lib/uploadConfig";
import { parseJsonResponse } from "@/lib/safeJson";
import { type ExamType } from "@/lib/schema";
import { Loader2, Lock } from "lucide-react";
import { EXAM_FORMATS, ESSAY_ENABLED } from "@/lib/examFormats";
import {
  CARD_COUNT_OPTIONS,
  DEFAULT_CARD_COUNT,
  CARD_COUNT_MAX,
  effectivePlan,
} from "@/lib/quota";

// Labels for the flashcard-count chooser (Turbo-style). Kept here (UI copy)
// next to the picker that renders them.
const CARD_COUNT_LABELS: Record<number, string> = {
  10: "Schnell-Wiederholung",
  20: "Standard",
  30: "Umfassend",
  50: "Deep Dive",
};
import NewExamForm from "@/components/dashboard/NewExamForm";
import { attachPastExamsToExam } from "@/app/dashboard/actions";

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
// Exam-format options now live in the shared single-source-of-truth config
// (src/lib/examFormats.ts), used by BOTH this picker and the anonymous landing
// try-widget so they never drift. `ESSAY_ENABLED` is re-exported from there.

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
  // Flashcard-count chooser + per-pack focus. Default = Standard (20).
  const [cardCount, setCardCount] = useState<number>(DEFAULT_CARD_COUNT);
  const [cardInstructions, setCardInstructions] = useState("");
  // Effective plan → caps which card-count steps are unlocked.
  const [plan, setPlan] = useState<string>("free");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [quotaHit, setQuotaHit] = useState<QuotaHitDetails | null>(null);
  const [completed, setCompleted] = useState(false);
  const [mode, setMode] = useState<"single" | "cram">("single");
  const [examChoices, setExamChoices] = useState<
    { id: string; title: string }[]
  >([]);
  const [examId, setExamId] = useState<string | null>(null);
  // Altklausuren attached to the selected exam at submit time (0-n files).
  const [pastExamFiles, setPastExamFiles] = useState<File[]>([]);
  // True while the pre-generation Altklausur upload+analysis runs — drives
  // the interstitial busy view before GenerationProgress takes over.
  const [analyzingPastExams, setAnalyzingPastExams] = useState(false);
  // How many past-exam references the selected exam already has — keeps the
  // "neue kommen dazu" hint truthful.
  const [existingRefsCount, setExistingRefsCount] = useState(0);
  // Funnel: upload_started fires once when an authed user first adds a file.
  const uploadStartedRef = useRef(false);
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
        const [{ data }, { data: profile }] = await Promise.all([
          supabase
            .from("exams")
            .select("id, title")
            .order("exam_date", { ascending: true, nullsFirst: false }),
          supabase.from("users").select("plan, plan_expires_at").maybeSingle(),
        ]);
        if (cancelled) return;
        if (profile) {
          setPlan(
            effectivePlan(
              profile.plan as string | null,
              profile.plan_expires_at as string | null,
            ),
          );
        }
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
      if (accepted.length > 0 && !uploadStartedRef.current) {
        uploadStartedRef.current = true;
        track("upload_started", { anonymous: false, file_count: accepted.length });
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

  // Second dropzone for Altklausuren — only rendered when an exam is
  // selected, but hooked unconditionally.
  const onDropPastExams = useCallback((accepted: File[]) => {
    setPastExamFiles((prev) => {
      const next = [...prev];
      for (const f of accepted) {
        if (next.length >= MAX_PAST_EXAM_FILES) break;
        if (!next.some((x) => x.name === f.name && x.size === f.size)) {
          next.push(f);
        }
      }
      return next;
    });
  }, []);
  const pastExamZone = useDropzone({
    onDrop: onDropPastExams,
    accept: ACCEPTED_MIME,
    maxSize: MAX_FILE_BYTES,
    maxFiles: MAX_PAST_EXAM_FILES,
    disabled: busy,
  });

  // Count existing past-exam references of the selected exam (RLS-scoped,
  // head-count only) so the section can say "n bereits hinterlegt".
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!examId) {
        if (!cancelled) setExistingRefsCount(0);
        return;
      }
      try {
        const { createClient } = await import("@/lib/supabase/browser");
        const supabase = createClient();
        const { count } = await supabase
          .from("exam_references")
          .select("id", { count: "exact", head: true })
          .eq("exam_id", examId)
          .eq("kind", "past_exam");
        if (!cancelled && typeof count === "number") {
          setExistingRefsCount(count);
        }
      } catch {
        /* badge just stays hidden */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [examId]);

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

    track("pack_generation_started", {
      exam_type: examType,
      file_count: files.length,
      total_mb: Number(
        (files.reduce((sum, f) => sum + f.size, 0) / 1024 / 1024).toFixed(1),
      ),
      path: "generate",
    });

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

      // 0) Altklausuren first: upload + attach + analyze, AWAITED, so the
      //    merged profile is persisted before /api/generate reads it for
      //    the lens. Failures degrade to lens-less generation with a toast —
      //    never block the pack.
      if (resolvedExamId && pastExamFiles.length > 0) {
        setAnalyzingPastExams(true);
        try {
          const uploaded: { storagePath: string; filename: string }[] = [];
          for (const f of pastExamFiles) {
            const path = buildUploadPath(user.id, f.name);
            const { error: upErr } = await supabase.storage
              .from(STUDY_UPLOADS_BUCKET)
              .upload(path, f, {
                contentType: f.type || "application/octet-stream",
                upsert: false,
              });
            if (upErr) {
              throw new Error(
                `Upload fehlgeschlagen: ${f.name} — ${upErr.message}`,
              );
            }
            uploaded.push({ storagePath: path, filename: f.name });
          }
          const attach = await attachPastExamsToExam({
            examId: resolvedExamId,
            files: uploaded,
          });
          const { toast } = await import("sonner");
          if (attach.skipped && attach.skipped.length > 0) {
            toast.warning(
              `Kein Text lesbar (vermutlich gescannt) — übersprungen: ${attach.skipped.join(", ")}.`,
              { duration: 10000 },
            );
          }
          if (!attach.ok) {
            toast.warning(
              `Altklausur-Analyse fehlgeschlagen (${attach.reason ?? "unbekannt"}) — Paket wird ohne Altklausur-Profil generiert.`,
              { duration: 8000 },
            );
          } else {
            // These files are persisted references now — clear them so a
            // failure in a LATER step (material upload, generation) doesn't
            // re-upload and re-attach the same Altklausuren on resubmit.
            setPastExamFiles([]);
            if (typeof attach.analyzed === "number") {
              setExistingRefsCount(attach.analyzed);
            }
          }
        } catch (attachErr) {
          const { toast } = await import("sonner");
          toast.warning(
            attachErr instanceof Error
              ? attachErr.message
              : "Altklausur-Upload fehlgeschlagen — Paket wird ohne Altklausur-Profil generiert.",
            { duration: 8000 },
          );
        } finally {
          setAnalyzingPastExams(false);
        }
      }

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
            cardCount,
            cardInstructions: cardInstructions.trim() || undefined,
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
          track("generation_quota_hit", {
            plan: json.plan ?? "free",
            used: json.used ?? 0,
            limit: json.limit,
          });
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
      // Unified funnel step shared with the anon path → one "Paket fertig"
      // event to break down by $device_type.
      track("pack_generated", {
        anonymous: false,
        cards: json.pack?.flashcards?.length ?? 0,
        has_quiz: Boolean(json.pack?.simulator?.questions?.length),
        exam_type: examType,
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
    track("pack_generation_started", {
      exam_type: examType,
      file_count: files.length,
      total_mb: Number(
        (files.reduce((sum, f) => sum + f.size, 0) / 1024 / 1024).toFixed(1),
      ),
      path: "cram",
    });
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
            {analyzingPastExams ? (
              <div style={{ padding: "32px 0", textAlign: "center" }}>
                <Loader2
                  size={22}
                  strokeWidth={2}
                  className="mx-auto animate-spin"
                  color="var(--color-ln-cyan)"
                  aria-hidden
                />
                <p className="mt-4 text-[15px] font-medium text-white">
                  Analysiere Altklausuren…
                </p>
                <p
                  className="mt-2 text-[12.5px]"
                  style={{ color: "rgba(255,255,255,0.5)" }}
                >
                  {pastExamFiles.length} Datei
                  {pastExamFiles.length === 1 ? "" : "en"} — dauert etwa eine
                  Minute. Danach startet die Generierung.
                </p>
              </div>
            ) : (
              <GenerationProgress
                completed={completed}
                language="de"
                totalBytes={files.reduce((sum, f) => sum + f.size, 0)}
                hasExam={Boolean(examId)}
              />
            )}
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
        <Link
          href="/dashboard"
          className="text-[13px] transition hover:text-white"
          style={{ color: "rgba(255,255,255,0.55)" }}
        >
          ← Dashboard
        </Link>

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
                onCreated={({ id, title, hasPastExam }) => {
                  setExamChoices((prev) => [...prev, { id, title }]);
                  setExamId(id);
                  setCreatingNewExam(false);
                  // The embedded form just attached Altklausuren — reflect
                  // them immediately (the refs-count effect would race the
                  // server action's revalidation otherwise).
                  if (hasPastExam) setExistingRefsCount((n) => n + 1);
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
          <h2
            className="mb-3 text-[12px] uppercase tracking-[0.22em]"
            style={{ color: "rgba(255,255,255,0.55)" }}
          >
            Altklausuren <span className="lowercase">(optional)</span>
          </h2>
          {examId ? (
            <>
              <div
                {...pastExamZone.getRootProps()}
                className="cursor-pointer rounded-2xl px-4 py-8 text-center transition"
                style={{
                  border: `1px dashed ${
                    pastExamZone.isDragActive
                      ? "rgba(79,209,165,0.7)"
                      : "rgba(255,255,255,0.22)"
                  }`,
                  background: pastExamZone.isDragActive
                    ? "rgba(79,209,165,0.06)"
                    : "transparent",
                }}
              >
                <input {...pastExamZone.getInputProps()} />
                <p className="text-[14px] font-medium text-white">
                  Altklausuren hier rein (PDF) – je mehr, desto realistischer
                  wird deine Probeklausur.
                </p>
                <p
                  className="mt-1 text-[12px]"
                  style={{ color: "rgba(255,255,255,0.5)" }}
                >
                  oder klicken zum Auswählen · max. {MAX_PAST_EXAM_FILES}{" "}
                  Dateien
                </p>
              </div>
              {existingRefsCount > 0 && (
                <p
                  className="mt-2 text-[12px]"
                  style={{ color: "rgba(255,255,255,0.55)" }}
                >
                  {existingRefsCount} Altklausur
                  {existingRefsCount === 1 ? "" : "en"} bereits hinterlegt —
                  neue kommen dazu.
                </p>
              )}
              {pastExamFiles.length > 0 && (
                <ul className="mt-3 space-y-2">
                  {pastExamFiles.map((f) => (
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
                        onClick={() =>
                          setPastExamFiles((prev) =>
                            prev.filter((x) => x.name !== f.name),
                          )
                        }
                        className="ml-3 text-white/50 transition hover:text-white"
                        aria-label={`${f.name} entfernen`}
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <div
              className="rounded-2xl px-4 py-4"
              style={{
                background: "rgba(20, 22, 28, 0.45)",
                border: "1px solid rgba(255,255,255,0.12)",
              }}
            >
              <p className="text-[13px] leading-relaxed text-white">
                Ohne Altklausuren schätze ich, was drankommt. Mit ihnen weiß
                ich es.
              </p>
              <p
                className="mt-1 text-[12px]"
                style={{ color: "rgba(255,255,255,0.55)" }}
              >
                Wähl oben eine Klausur aus oder leg eine neue an, um
                Altklausuren hochzuladen.
              </p>
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
            {EXAM_FORMATS.map((opt) => {
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
                      <opt.Icon
                        size={18}
                        strokeWidth={1.9}
                        color={active ? "var(--color-ln-cyan)" : "rgba(255,255,255,0.7)"}
                        aria-hidden
                      />
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
            Anzahl Karteikarten
          </h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {CARD_COUNT_OPTIONS.map((n) => {
              const cap = CARD_COUNT_MAX[plan] ?? CARD_COUNT_MAX.free;
              const locked = n > cap;
              const active = cardCount === n && !locked;
              return (
                <button
                  key={n}
                  type="button"
                  disabled={locked}
                  aria-disabled={locked}
                  onClick={() => {
                    if (!locked) setCardCount(n);
                  }}
                  className={
                    "relative rounded-2xl px-3 py-3 text-left transition " +
                    (locked ? "cursor-not-allowed" : "")
                  }
                  style={{
                    background: active
                      ? "rgba(111,199,227,0.08)"
                      : "rgba(20, 22, 28, 0.45)",
                    border: `1px solid ${
                      active ? "rgba(111,199,227,0.5)" : "rgba(255,255,255,0.12)"
                    }`,
                    opacity: locked ? 0.55 : 1,
                  }}
                >
                  {locked && (
                    <Lock
                      size={13}
                      strokeWidth={1.9}
                      color="var(--color-text-faint)"
                      aria-hidden
                      className="absolute right-2.5 top-2.5"
                    />
                  )}
                  <div className="text-[17px] font-bold tabular-nums text-white">
                    {n}
                  </div>
                  <div
                    className="mt-0.5 text-[11px] leading-snug"
                    style={{
                      color: active
                        ? "var(--color-ln-cyan)"
                        : "rgba(255,255,255,0.55)",
                    }}
                  >
                    {CARD_COUNT_LABELS[n]}
                  </div>
                </button>
              );
            })}
          </div>
          {(CARD_COUNT_MAX[plan] ?? CARD_COUNT_MAX.free) < 50 && (
            <p
              className="mt-2 text-[12px]"
              style={{ color: "rgba(255,255,255,0.5)" }}
            >
              Bis zu 50 Karten pro Paket mit einem{" "}
              <Link
                href="/dashboard/settings"
                className="font-medium underline-offset-2 hover:underline"
                style={{ color: "var(--color-ln-cyan)" }}
              >
                Upgrade
              </Link>
              .
            </p>
          )}
          <textarea
            value={cardInstructions}
            onChange={(e) => setCardInstructions(e.target.value)}
            rows={2}
            placeholder="Worauf sollen die Karten fokussieren? (optional — z.B. Formeln, Definitionen, Fallbeispiele)"
            className="mt-3 w-full rounded-2xl px-4 py-3 text-[14px] text-white outline-none transition focus:border-white/40"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.14)",
            }}
          />
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
