"use client";

import { FileText, UploadCloud } from "lucide-react";
import MockupShell from "./MockupShell";

/**
 * Static copy of the "Material hochladen" screen (the real /dashboard/new page
 * is an interactive dropzone + auth-gated form - not statically renderable).
 * Focused: dropzone + attached files + format picker.
 */
const PRIMARY = "var(--color-primary-bright)";

const FILES = [
  { name: "Vorlesung_BWL.pdf", size: "4.2 MB" },
  { name: "Mitschrift_Woche3.pdf", size: "1.1 MB" },
];
const FORMATS = [
  { label: "Multiple Choice", sel: true },
  { label: "Offene Fragen", sel: false },
];

export default function UploadMaskMockup() {
  return (
    <MockupShell glow="#2B3499" glowX="50%" glowY="50%" tilt="l">
      <div className="text-[15px] font-semibold text-white" style={{ fontFamily: "var(--font-display)" }}>
        Material hochladen
      </div>

      {/* Dropzone */}
      <div
        className="mt-3 flex flex-col items-center rounded-xl border border-dashed px-4 py-6 text-center"
        style={{ borderColor: "rgba(255,255,255,0.18)", background: "rgba(255,255,255,0.03)" }}
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: "rgba(110,128,242,0.16)" }}>
          <UploadCloud size={20} style={{ color: PRIMARY }} />
        </span>
        <p className="mt-2 text-[12.5px] text-white/85">PDFs, Folien oder Notizen hier rein</p>
        <p className="mt-0.5 text-[11px]" style={{ color: "rgba(255,255,255,0.45)" }}>
          bis zu 8 Dateien · PDF, TXT, MD
        </p>
      </div>

      {/* Attached files */}
      <ul className="mt-3 space-y-1.5">
        {FILES.map((f) => (
          <li
            key={f.name}
            className="flex items-center gap-2.5 rounded-lg border px-3 py-2"
            style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.08)" }}
          >
            <FileText size={14} className="shrink-0 text-white/55" />
            <span className="min-w-0 flex-1 truncate text-[12.5px] text-white/85">{f.name}</span>
            <span className="shrink-0 text-[11px]" style={{ color: "rgba(255,255,255,0.4)" }}>{f.size}</span>
          </li>
        ))}
      </ul>

      {/* Format picker */}
      <div className="mt-3.5">
        <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: "rgba(255,255,255,0.5)" }}>
          Prüfungsformat
        </div>
        <div className="flex gap-2">
          {FORMATS.map((f) => (
            <div
              key={f.label}
              className="flex-1 rounded-lg border px-3 py-2 text-center text-[12.5px] font-medium"
              style={{
                background: f.sel ? "rgba(110,128,242,0.10)" : "#171C30",
                borderColor: f.sel ? PRIMARY : "rgba(255,255,255,0.06)",
                color: f.sel ? "#fff" : "rgba(255,255,255,0.7)",
              }}
            >
              {f.label}
            </div>
          ))}
        </div>
      </div>
    </MockupShell>
  );
}
