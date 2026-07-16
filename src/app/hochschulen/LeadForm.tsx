"use client";

import { useState, type FormEvent } from "react";
import { CheckCircle, Loader2 } from "lucide-react";

const FALLBACK_MAILTO =
  "mailto:info@lernly-app.de?subject=Lernly%20Hochschul-Pilot";

const inputClass =
  "w-full rounded-xl border border-[#E6E8EC] bg-white px-4 py-3 " +
  "text-[15px] text-[#0E1116] placeholder-[#9AA1AC] outline-none transition " +
  "focus:border-[#1421C5] focus:ring-2 focus:ring-[rgba(20,33,197,0.12)]";

const labelClass = "mb-1.5 block text-[13px] font-medium text-[#374151]";

type Status = "idle" | "sending" | "success" | "error";

// Qualification field (Wooclap pattern) — routed into the message body so
// the /api/feedback contract stays unchanged.
const ROLES = [
  "Lehrende:r / Professor:in",
  "Studiengangsleitung / Dekanat",
  "Hochschuldidaktik / E-Learning",
  "IT / Verwaltung",
  "Sonstiges",
] as const;

// B2B lead form for /hochschulen. Reuses the existing POST /api/feedback
// route (Notion Feedback DB) so inquiries land next to in-app feedback.
export default function LeadForm() {
  const [name, setName] = useState("");
  const [hochschule, setHochschule] = useState("");
  const [email, setEmail] = useState("");
  const [rolle, setRolle] = useState("");
  const [nachricht, setNachricht] = useState("");
  // Honeypot — hidden from real users; bots that fill it are dropped server-side.
  const [website, setWebsite] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === "sending") return;
    setStatus("sending");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          betreff: `Hochschul-Anfrage: ${hochschule}`,
          nachricht: rolle ? `Rolle: ${rolle}\n\n${nachricht}` : nachricht,
          typ: "Frage",
          quelle: "Hochschul-Landing",
          email,
          person: name,
          kontext: "/hochschulen",
          website,
        }),
      });
      setStatus(res.ok ? "success" : "error");
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
        <span
          className="flex h-12 w-12 items-center justify-center rounded-xl"
          style={{ background: "rgba(22,142,84,0.1)" }}
        >
          <CheckCircle
            size={24}
            strokeWidth={2}
            aria-hidden
            style={{ color: "#168E54" }}
          />
        </span>
        <p className="text-[17px] font-semibold" style={{ color: "var(--hs-ink)" }}>
          Danke, wir melden uns.
        </p>
        <p className="max-w-[380px] text-[14px] leading-relaxed" style={{ color: "var(--hs-mute)" }}>
          Ihre Anfrage ist eingegangen. Sie hören in der Regel innerhalb von
          zwei Werktagen von uns.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate={false}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="lead-name" className={labelClass}>
            Name
          </label>
          <input
            id="lead-name"
            type="text"
            required
            maxLength={150}
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Vor- und Nachname"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="lead-hochschule" className={labelClass}>
            Hochschule
          </label>
          <input
            id="lead-hochschule"
            type="text"
            required
            maxLength={150}
            autoComplete="organization"
            value={hochschule}
            onChange={(e) => setHochschule(e.target.value)}
            placeholder="Name der Einrichtung"
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="lead-email" className={labelClass}>
            E-Mail
          </label>
          <input
            id="lead-email"
            type="email"
            required
            maxLength={200}
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@hochschule.de"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="lead-rolle" className={labelClass}>
            Ihre Rolle
          </label>
          <select
            id="lead-rolle"
            required
            value={rolle}
            onChange={(e) => setRolle(e.target.value)}
            className={inputClass + " appearance-none"}
          >
            <option value="" disabled>
              Bitte wählen
            </option>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="lead-nachricht" className={labelClass}>
          Modul / Nachricht
        </label>
        <textarea
          id="lead-nachricht"
          required
          minLength={3}
          maxLength={4000}
          rows={4}
          value={nachricht}
          onChange={(e) => setNachricht(e.target.value)}
          placeholder="Welches Modul, wie viele Studierende, welcher Zeitraum?"
          className={inputClass + " resize-y"}
        />
      </div>

      {/* Honeypot field — visually hidden, real users never see or fill it. */}
      <div
        aria-hidden="true"
        className="absolute -left-[9999px] h-px w-px overflow-hidden"
      >
        <label htmlFor="lead-website">Website</label>
        <input
          id="lead-website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
      </div>

      {status === "error" && (
        <p
          className="rounded-xl border px-4 py-3 text-[13px] leading-relaxed"
          style={{
            borderColor: "rgba(190,40,60,0.3)",
            background: "rgba(190,40,60,0.05)",
            color: "#8C1D2E",
          }}
        >
          Das hat leider nicht geklappt. Bitte versuchen Sie es erneut oder
          schreiben Sie uns direkt an{" "}
          <a href={FALLBACK_MAILTO} className="font-medium underline underline-offset-2" style={{ color: "#8C1D2E" }}>
            info@lernly-app.de
          </a>
          .
        </p>
      )}

      <button
        type="submit"
        disabled={status === "sending"}
        className="mt-1 inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-[15px] font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
        style={{ background: "#1421C5" }}
      >
        {status === "sending" && (
          <Loader2 size={16} strokeWidth={2} aria-hidden className="animate-spin" />
        )}
        Gespräch anfragen
      </button>
    </form>
  );
}
