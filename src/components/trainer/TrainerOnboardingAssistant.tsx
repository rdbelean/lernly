"use client";

import { useState, type RefObject } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  ChevronDown,
  ChevronUp,
  ClipboardPaste,
  Copy,
  Download,
  FolderOpen,
  Laptop,
  Loader2,
  Sparkles,
  Terminal,
  Upload,
  X,
} from "lucide-react";
import { LERNLY_MASTER_PROMPT } from "@/lib/trainer/masterPrompt";

export interface TrainerOnboardingAssistantProps {
  isSaving: boolean;
  focusUpload?: boolean;
  syncToken?: string | null;
  canDismiss?: boolean;
  fileInputRef: RefObject<HTMLInputElement | null>;
  folderInputRef: RefObject<HTMLInputElement | null>;
  onFiles: (files: FileList | File[]) => void;
  onPasteSubmit: (rawText: string) => void;
  onClose?: () => void;
}

const DESKTOP_STARTER_COMMAND =
  "Schau in meinen Uni-Ordner und lass uns mit [Fachname] starten.";

export function TrainerOnboardingAssistant({
  isSaving,
  focusUpload = false,
  syncToken = null,
  canDismiss = false,
  fileInputRef,
  folderInputRef,
  onFiles,
  onPasteSubmit,
  onClose,
}: TrainerOnboardingAssistantProps) {
  const [mode, setMode] = useState<"quick" | "desktop">("quick");
  const [dragging, setDragging] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [showPromptPreview, setShowPromptPreview] = useState(false);
  const [copiedKey, setCopiedKey] = useState<
    "prompt" | "token" | "command" | null
  >(null);

  const copyText = async (
    value: string,
    key: "prompt" | "token" | "command",
  ) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      window.setTimeout(
        () => setCopiedKey((cur) => (cur === key ? null : cur)),
        2500,
      );
    } catch {
      if (key === "prompt") setShowPromptPreview(true);
    }
  };

  return (
    <div
      className={`mt-5 overflow-hidden rounded-2xl border transition ${
        focusUpload
          ? "border-primary bg-surface shadow-sm"
          : "border-ink-a14 bg-surface"
      }`}
    >
      {/* Top Bar: Title + Way Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-surface-2/60 px-5 py-4">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-work-bg px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-work-ink">
            <Sparkles className="h-3 w-3" aria-hidden="true" />
            <span>In 60 Sekunden zum eigenen Klausur-Trainer</span>
          </span>
          <h2 className="mt-1.5 font-display text-[19px] font-semibold tracking-[-0.02em] text-text">
            Neuen Kurs aus deinen Unterlagen erstellen
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <div
            role="tablist"
            aria-label="Einrichtungsweg wählen"
            className="inline-flex rounded-xl border border-line bg-surface p-1"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mode === "quick"}
              onClick={() => setMode("quick")}
              className={`rounded-lg px-3 py-1.5 text-[12.5px] font-semibold transition ${
                mode === "quick"
                  ? "bg-primary text-on-primary"
                  : "text-text-dim hover:text-text"
              }`}
            >
              Schnellstart (Claude &amp; ChatGPT)
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "desktop"}
              onClick={() => setMode("desktop")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] font-semibold transition ${
                mode === "desktop"
                  ? "bg-primary text-on-primary"
                  : "text-text-dim hover:text-text"
              }`}
            >
              <Laptop className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Vollautomatik (Mac)</span>
            </button>
          </div>

          {canDismiss && onClose ? (
            <button
              type="button"
              onClick={onClose}
              aria-label="Assistent schließen"
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-surface text-text-dim transition hover:text-text"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : null}
        </div>
      </div>

      {mode === "quick" ? (
        <div className="space-y-5 p-5 sm:p-6">
          {/* Step 1 + 2 Banner */}
          <div className="flex flex-col justify-between gap-4 rounded-xl border border-line bg-surface-2/40 p-4 sm:flex-row sm:items-center">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.06em] text-text-dim">
                <span>Schritt 1 &amp; 2</span>
                <span>·</span>
                <span>Ohne Installation in deinem Browser</span>
              </div>
              <p className="mt-1 text-[15px] font-semibold text-text">
                1-Klick-Prompt kopieren, Folien + Altklausuren in Claude oder
                ChatGPT geben &amp; 4 Fragen beantworten
              </p>
              <p className="mt-0.5 text-[13px] text-text-dim">
                Funktioniert mit deinem bestehenden Account (auch kostenlos) —
                kein extra KI-Abo nötig.
              </p>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void copyText(LERNLY_MASTER_PROMPT, "prompt")}
                className={`inline-flex h-10 items-center gap-2 rounded-xl px-4 text-[13.5px] font-semibold transition ${
                  copiedKey === "prompt"
                    ? "bg-ok-bg text-ok-ink"
                    : "bg-primary text-on-primary hover:bg-primary-press"
                }`}
              >
                {copiedKey === "prompt" ? (
                  <>
                    <Check className="h-4 w-4" aria-hidden="true" />
                    <span>Kopiert! Jetzt in KI einfügen</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" aria-hidden="true" />
                    <span>1-Klick-Prompt kopieren</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setShowPromptPreview((v) => !v)}
                className="inline-flex h-10 items-center gap-1 rounded-xl border border-line bg-surface px-3 text-[12.5px] font-medium text-text-dim transition hover:text-text"
              >
                <span>{showPromptPreview ? "Ausblenden" : "Ansehen"}</span>
                {showPromptPreview ? (
                  <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>

          {showPromptPreview ? (
            <pre className="max-h-56 overflow-auto rounded-xl border border-line bg-surface-2 p-3.5 font-mono text-[12px] leading-relaxed text-text-dim whitespace-pre-wrap">
              {LERNLY_MASTER_PROMPT}
            </pre>
          ) : null}

          {/* Step 3: File Dropzone + Direct Cmd+V Paste */}
          <div>
            <p className="mb-2.5 text-[12px] font-semibold uppercase tracking-[0.06em] text-text-dim">
              Schritt 3 · Fertiges Lernpaket hier direkt öffnen
            </p>

            <div className="grid gap-4 lg:grid-cols-2">
              {/* Option A: Direct Paste (no file saving required) */}
              <div className="flex flex-col rounded-xl border border-line bg-surface p-4">
                <div className="flex items-center gap-2 text-[14px] font-semibold text-text">
                  <ClipboardPaste
                    className="h-4 w-4 text-primary-bright"
                    aria-hidden="true"
                  />
                  <span>Antwort direkt einfügen (Cmd+V)</span>
                </div>
                <p className="mt-1 text-[12.5px] text-text-dim">
                  Keine Datei speichern: Kopiere einfach den Codeblock aus
                  ChatGPT oder Claude und füge ihn hier ein.
                </p>

                <textarea
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  rows={4}
                  placeholder="Antwort aus Claude oder ChatGPT hier einfügen..."
                  aria-label="Lernpaket per Copy-Paste einfügen"
                  className="mt-3 w-full flex-1 resize-none rounded-xl border border-line bg-surface-2 p-3 font-mono text-[12px] text-text outline-none transition placeholder:text-text-faint focus:border-primary"
                />

                <button
                  type="button"
                  disabled={isSaving || pasteText.trim().length === 0}
                  onClick={() => onPasteSubmit(pasteText)}
                  className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-[13.5px] font-semibold text-on-primary transition hover:bg-primary-press disabled:opacity-45"
                >
                  {isSaving ? (
                    <Loader2
                      className="h-4 w-4 animate-spin"
                      aria-hidden="true"
                    />
                  ) : (
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  )}
                  <span>Kurs direkt öffnen &amp; speichern</span>
                </button>
              </div>

              {/* Option B: Dropzone for File / Folder */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  if (e.dataTransfer.files) onFiles(e.dataTransfer.files);
                }}
                className={`flex flex-col justify-between rounded-xl border border-dashed p-4 transition ${
                  dragging
                    ? "border-primary bg-work-bg/40"
                    : "border-ink-a14 bg-surface-2/30"
                }`}
              >
                <div>
                  <div className="flex items-center gap-2 text-[14px] font-semibold text-text">
                    <Upload
                      className="h-4 w-4 text-primary-bright"
                      aria-hidden="true"
                    />
                    <span>Oder Datei bzw. Kursordner reinziehen</span>
                  </div>
                  <p className="mt-1 text-[12.5px] text-text-dim">
                    Unterstützt jede <code>.json</code>-Antwort, deine{" "}
                    <code>Lernly-Trainer.html</code> oder den gesamten{" "}
                    <code>_lernly</code>-Ordner.
                  </p>
                </div>

                <div className="mt-4 flex flex-wrap gap-2.5">
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-line bg-surface px-4 text-[13.5px] font-semibold text-text transition hover:bg-surface-2 disabled:opacity-60"
                  >
                    <Upload className="h-4 w-4" aria-hidden="true" />
                    <span>JSON / HTML wählen</span>
                  </button>
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => folderInputRef.current?.click()}
                    className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-line bg-surface px-4 text-[13.5px] font-semibold text-text transition hover:bg-surface-2 disabled:opacity-60"
                  >
                    <FolderOpen className="h-4 w-4" aria-hidden="true" />
                    <span>_lernly-Ordner wählen</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4 p-5 sm:p-6">
          <p className="text-[13.5px] text-text-dim">
            Du lernst am Mac mit <strong>Claude Desktop</strong>? Verbinde
            einmalig deinen ganzen Uni-Ordner — danach analysiert Claude jedes
            Fach selbstständig und schiebt fertige Kurse vollautomatisch in
            dein Dashboard.
          </p>

          <ol className="grid gap-3 md:grid-cols-3">
            <li className="flex flex-col justify-between rounded-xl border border-line bg-surface-2/40 p-4">
              <div>
                <span className="text-[11.5px] font-semibold uppercase tracking-[0.06em] text-text-faint">
                  1. Erweiterung installieren
                </span>
                <p className="mt-1 text-[14px] font-semibold text-text">
                  Lernly-Erweiterung laden
                </p>
                <p className="mt-1 text-[12.5px] text-text-dim">
                  Herunterladen, per Doppelklick in Claude Desktop öffnen und
                  deinen Uni-Ordner auswählen.
                </p>
              </div>
              <a
                href="/lernly-beta-0.2.0.mcpb"
                download="lernly-beta-0.2.0.mcpb"
                className="mt-4 inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-primary px-3.5 text-[13px] font-semibold text-on-primary transition hover:bg-primary-press"
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Erweiterung (.mcpb)</span>
              </a>
            </li>

            <li className="flex flex-col justify-between rounded-xl border border-line bg-surface-2/40 p-4">
              <div>
                <span className="text-[11.5px] font-semibold uppercase tracking-[0.06em] text-text-faint">
                  2. Mit Lernly verknüpfen
                </span>
                <p className="mt-1 text-[14px] font-semibold text-text">
                  Sync-Token hinterlegen
                </p>
                <p className="mt-1 text-[12.5px] text-text-dim">
                  Kopiere deinen persönlichen Token in die
                  Erweiterungs-Einstellungen, damit Kurse automatisch hier
                  erscheinen.
                </p>
              </div>
              {syncToken ? (
                <button
                  type="button"
                  onClick={() => void copyText(syncToken, "token")}
                  className={`mt-4 inline-flex h-9 items-center justify-center gap-2 rounded-xl border px-3.5 text-[13px] font-semibold transition ${
                    copiedKey === "token"
                      ? "border-ok-ink bg-ok-bg text-ok-ink"
                      : "border-line bg-surface text-text hover:bg-surface-2"
                  }`}
                >
                  {copiedKey === "token" ? (
                    <>
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Token kopiert</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Sync-Token kopieren</span>
                    </>
                  )}
                </button>
              ) : (
                <Link
                  href="/dashboard/settings"
                  className="mt-4 inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-line bg-surface px-3.5 text-[13px] font-semibold text-text transition hover:bg-surface-2"
                >
                  <span>Token in Konto öffnen</span>
                </Link>
              )}
            </li>

            <li className="flex flex-col justify-between rounded-xl border border-line bg-surface-2/40 p-4">
              <div>
                <span className="text-[11.5px] font-semibold uppercase tracking-[0.06em] text-text-faint">
                  3. Im Chat starten
                </span>
                <p className="mt-1 text-[14px] font-semibold text-text">
                  Fach ansagen &amp; zurücklehnen
                </p>
                <p className="mt-1 rounded-lg border border-line bg-surface px-2.5 py-2 font-mono text-[11.5px] text-text-dim">
                  {DESKTOP_STARTER_COMMAND}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void copyText(DESKTOP_STARTER_COMMAND, "command")}
                className={`mt-4 inline-flex h-9 items-center justify-center gap-2 rounded-xl border px-3.5 text-[13px] font-semibold transition ${
                  copiedKey === "command"
                    ? "border-ok-ink bg-ok-bg text-ok-ink"
                    : "border-line bg-surface text-text hover:bg-surface-2"
                }`}
              >
                {copiedKey === "command" ? (
                  <>
                    <Check className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Befehl kopiert</span>
                  </>
                ) : (
                  <>
                    <Terminal className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Starter-Satz kopieren</span>
                  </>
                )}
              </button>
            </li>
          </ol>
        </div>
      )}
    </div>
  );
}
