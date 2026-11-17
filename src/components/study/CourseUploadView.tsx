"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, Check, FileText, Upload, X } from "lucide-react";
import { PointsBar } from "@/components/study/viz/PointsBar";
import { saveActiveCourse } from "@/lib/study/courseStore";
import { importCourseFromJsonFiles } from "@/lib/study/importCourse";
import type { StudyCourseSeed } from "@/lib/study/types";

type UploadTab = "json" | "pdf";

type PreviewData = {
  course: StudyCourseSeed;
  summary: {
    topics: number;
    totalPoints: number;
    flashcards: number;
    exercises: number;
  };
  sourceLabel: string;
};

export function CourseUploadView() {
  const router = useRouter();
  const jsonInputRef = useRef<HTMLInputElement | null>(null);
  const pdfInputRef = useRef<HTMLInputElement | null>(null);

  const [tab, setTab] = useState<UploadTab>("json");
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewData | null>(null);

  // PDF extraction state
  const [pdfFiles, setPdfFiles] = useState<File[]>([]);
  const [courseName, setCourseName] = useState("");
  const [examDate, setExamDate] = useState("");
  const [extracting, setExtracting] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        router.push("/heute");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [router]);

  const handleJsonFiles = useCallback(async (fileList: FileList | File[]) => {
    setError(null);
    setPreview(null);
    const files = Array.from(fileList).filter((f) =>
      f.name.toLowerCase().endsWith(".json"),
    );
    if (files.length === 0) {
      setError("Bitte wähle mindestens eine .json-Datei aus (z. B. kurs.json).");
      return;
    }
    try {
      const inputs = await Promise.all(
        files.map(async (file) => ({
          name: file.name,
          content: await file.text(),
        })),
      );
      const result = importCourseFromJsonFiles(inputs);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setPreview({
        course: result.course,
        summary: result.summary,
        sourceLabel:
          result.sourceKind === "mcp-bundle"
            ? "Claude / MCP-Paket"
            : "Lernly-Kursdatei",
      });
    } catch {
      setError("Die ausgewählten Dateien konnten nicht gelesen werden.");
    }
  }, []);

  const handlePdfSelection = useCallback((fileList: FileList | File[]) => {
    setError(null);
    setPreview(null);
    const allowed = Array.from(fileList).filter((f) => {
      const lower = f.name.toLowerCase();
      return (
        lower.endsWith(".pdf") ||
        lower.endsWith(".txt") ||
        lower.endsWith(".md") ||
        lower.endsWith(".markdown")
      );
    });
    if (allowed.length === 0) {
      setError("Bitte wähle PDF-, TXT- oder Markdown-Dateien aus.");
      return;
    }
    setPdfFiles(allowed.slice(0, 6));
  }, []);

  const handlePdfExtract = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      if (pdfFiles.length === 0) {
        setError("Wähle zuerst deine Folien oder Altklausuren aus.");
        return;
      }
      setError(null);
      setPreview(null);
      setExtracting(true);
      try {
        const formData = new FormData();
        for (const file of pdfFiles) {
          formData.append("files", file);
        }
        if (courseName.trim()) formData.append("courseName", courseName.trim());
        if (examDate.trim()) formData.append("examDate", examDate.trim());

        const res = await fetch("/api/study/extract", {
          method: "POST",
          body: formData,
        });
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
          course?: StudyCourseSeed;
          summary?: PreviewData["summary"];
        };

        if (!res.ok || !data.course || !data.summary) {
          setError(
            data.error ?? "Auswertung fehlgeschlagen. Bitte versuch es nochmal.",
          );
          return;
        }

        setPreview({
          course: data.course,
          summary: data.summary,
          sourceLabel: "PDF-Auswertung",
        });
      } catch {
        setError("Verbindung fehlgeschlagen. Bitte versuch es gleich nochmal.");
      } finally {
        setExtracting(false);
      }
    },
    [courseName, examDate, pdfFiles],
  );

  const handleApplyCourse = useCallback(() => {
    if (!preview) return;
    saveActiveCourse(preview.course);
    router.push("/heute");
  }, [preview, router]);

  return (
    <div className="mx-auto w-full max-w-[1120px] px-8 py-8 sm:px-12 sm:py-10 lg:px-14">
      <header>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 pb-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-text">
            Unterlagen
          </p>
          <p className="text-center text-[11px] font-semibold uppercase tracking-[0.08em] text-text-dim">
            Kurs importieren
          </p>
          <div className="flex justify-end">
            <Link
              href="/heute"
              aria-label="Zurück zu Heute"
              className="inline-flex h-8 w-8 items-center justify-center text-text transition-opacity hover:opacity-65"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </Link>
          </div>
        </div>
        <div className="h-[1px] w-full bg-line" />
      </header>

      <section className="mt-10 sm:mt-12">
        <h1 className="font-display text-[44px] font-bold leading-[1.04] tracking-[-0.035em] text-text sm:text-[58px]">
          Eigener Kurs
          <br />
          in 30 Sekunden
          <span
            aria-hidden="true"
            className="ml-[0.06em] inline-block h-[0.155em] w-[0.155em] bg-primary align-baseline"
          />
        </h1>
        <p className="mt-4 max-w-[540px] text-[16px] leading-[1.55] text-text-dim">
          Importiere dein fertiges Paket aus dem Claude-Connector oder lade
          Folien und Altklausuren direkt hoch.
        </p>
      </section>

      {/* Hairline mode switch */}
      <div
        role="tablist"
        aria-label="Import-Quelle"
        className="mt-9 flex gap-8 border-b border-line"
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab === "json"}
          onClick={() => {
            setTab("json");
            setError(null);
          }}
          className={`-mb-[1px] border-b-2 pb-3 text-[14px] font-semibold transition-colors ${
            tab === "json"
              ? "border-b-text text-text"
              : "border-b-transparent text-text-dim hover:text-text"
          }`}
        >
          Claude / JSON importieren
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={tab === "pdf"}
          onClick={() => {
            setTab("pdf");
            setError(null);
          }}
          className={`-mb-[1px] border-b-2 pb-3 text-[14px] font-semibold transition-colors ${
            tab === "pdf"
              ? "border-b-text text-text"
              : "border-b-transparent text-text-dim hover:text-text"
          }`}
        >
          Folien & Altklausuren (PDF)
        </button>
      </div>

      {/* Tab 1: Zero-cost Claude / MCP JSON dropzone */}
      {tab === "json" ? (
        <section className="mt-8">
          <input
            ref={jsonInputRef}
            type="file"
            accept=".json,application/json"
            multiple
            className="sr-only"
            onChange={(event) => {
              if (event.target.files) {
                void handleJsonFiles(event.target.files);
              }
            }}
          />

          <div
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setIsDragging(false);
              if (event.dataTransfer.files) {
                void handleJsonFiles(event.dataTransfer.files);
              }
            }}
            className={`flex flex-col items-start justify-between gap-6 border-t border-b py-8 transition-colors sm:flex-row sm:items-center ${
              isDragging
                ? "border-primary bg-work-bg/40 px-4"
                : "border-line"
            }`}
          >
            <div>
              <p className="text-[16px] font-semibold text-text">
                kurs.json und themen/*.json hier ablegen
              </p>
              <p className="mt-1 text-[14px] text-text-dim">
                Funktioniert sofort im Browser, ohne Login und ohne KI-Kosten.
              </p>
            </div>
            <button
              type="button"
              onClick={() => jsonInputRef.current?.click()}
              className="inline-flex h-[46px] shrink-0 items-center gap-2 rounded-btn bg-text px-6 text-[14px] font-semibold text-on-primary transition-opacity hover:opacity-88"
            >
              <Upload className="h-4 w-4" aria-hidden="true" />
              <span>Dateien wählen</span>
            </button>
          </div>
        </section>
      ) : (
        /* Tab 2: Server-side PDF / Altklausuren extraction */
        <form onSubmit={handlePdfExtract} className="mt-8 space-y-6">
          <input
            ref={pdfInputRef}
            type="file"
            accept=".pdf,.txt,.md,.markdown"
            multiple
            className="sr-only"
            onChange={(event) => {
              if (event.target.files) {
                handlePdfSelection(event.target.files);
              }
            }}
          />

          <div
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setIsDragging(false);
              if (event.dataTransfer.files) {
                handlePdfSelection(event.dataTransfer.files);
              }
            }}
            className={`flex flex-col items-start justify-between gap-6 border-t border-b py-8 transition-colors sm:flex-row sm:items-center ${
              isDragging
                ? "border-primary bg-work-bg/40 px-4"
                : "border-line"
            }`}
          >
            <div>
              <p className="text-[16px] font-semibold text-text">
                Folien und Altklausuren (PDF, TXT, MD)
              </p>
              <p className="mt-1 text-[14px] text-text-dim">
                Bis zu 6 Dateien, max. 15 MB. Themen, Punkte, Karten und
                Rechenaufgaben werden automatisch erstellt.
              </p>
            </div>
            <button
              type="button"
              onClick={() => pdfInputRef.current?.click()}
              className="inline-flex h-[46px] shrink-0 items-center gap-2 rounded-btn border border-line bg-surface px-6 text-[14px] font-semibold text-text transition-colors hover:bg-surface-2"
            >
              <Upload className="h-4 w-4" aria-hidden="true" />
              <span>PDFs wählen</span>
            </button>
          </div>

          {pdfFiles.length > 0 ? (
            <ul className="divide-y divide-line border-b border-line">
              {pdfFiles.map((file) => (
                <li
                  key={`${file.name}-${file.size}`}
                  className="flex items-center justify-between gap-4 py-3 text-[14px]"
                >
                  <span className="flex min-w-0 items-center gap-2.5 font-medium text-text">
                    <FileText
                      className="h-4 w-4 shrink-0 text-text-dim"
                      aria-hidden="true"
                    />
                    <span className="truncate">{file.name}</span>
                  </span>
                  <span className="shrink-0 text-text-dim">
                    {Math.max(1, Math.round(file.size / 1024))} KB
                  </span>
                </li>
              ))}
            </ul>
          ) : null}

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <label className="block">
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-text-dim">
                Kursname (optional)
              </span>
              <input
                type="text"
                placeholder="z. B. Corporate Finance"
                value={courseName}
                onChange={(event) => setCourseName(event.target.value)}
                className="mt-2 w-full border-b border-line bg-transparent pb-2 text-[16px] font-semibold text-text outline-none focus:border-b-text"
              />
            </label>

            <label className="block">
              <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-text-dim">
                Klausurdatum (optional)
              </span>
              <input
                type="date"
                value={examDate}
                onChange={(event) => setExamDate(event.target.value)}
                className="mt-2 w-full border-b border-line bg-transparent pb-2 text-[16px] font-semibold text-text outline-none focus:border-b-text"
              />
            </label>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={extracting || pdfFiles.length === 0}
              className="inline-flex h-[46px] items-center gap-2 rounded-btn bg-text px-7 text-[14px] font-semibold text-on-primary transition-opacity hover:opacity-88 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <span>
                {extracting
                  ? "Unterlagen werden ausgewertet …"
                  : "Auswerten"}
              </span>
            </button>
          </div>
        </form>
      )}

      {error ? (
        <p role="alert" className="mt-5 text-[14px] font-medium text-err-ink">
          {error}
        </p>
      ) : null}

      {/* Live Preview using real PointsBar component */}
      {preview ? (
        <section
          aria-label="Vorschau des importierten Kurses"
          className="mt-10 border-t border-text pt-8"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-4">
            <div>
              <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-ok-ink">
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{preview.sourceLabel} erkannt</span>
              </p>
              <h2 className="mt-2 font-display text-[32px] font-bold leading-tight tracking-[-0.03em] text-text">
                {preview.course.courseName}
              </h2>
            </div>

            <p className="text-[14px] font-semibold text-text-dim">
              {preview.summary.topics} Themen · {preview.summary.totalPoints} P ·{" "}
              {preview.summary.flashcards} Karten · {preview.summary.exercises}{" "}
              Rechenaufgaben
            </p>
          </div>

          <PointsBar topics={preview.course.topics} />

          <div className="mt-9">
            <button
              type="button"
              onClick={handleApplyCourse}
              className="inline-flex h-[50px] items-center gap-2 rounded-btn bg-primary px-7 text-[15px] font-semibold text-on-primary transition-colors hover:bg-primary-press active:bg-primary-press"
            >
              <span>Als aktiven Kurs starten</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
