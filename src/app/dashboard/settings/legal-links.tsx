import { FileText, ShieldCheck } from "lucide-react";
import CookieSettingsButton from "@/components/CookieSettingsButton";

// Footer-style row of legal page links — required for any paid B2C
// service in Germany.
const LINKS = [
  { href: "/impressum", label: "Impressum" },
  { href: "/datenschutz", label: "Datenschutzerklärung" },
  { href: "/agb", label: "AGB" },
  { href: "/widerruf", label: "Widerrufsbelehrung" },
];

export default function LegalLinks() {
  return (
    <ul className="flex flex-wrap gap-x-5 gap-y-2">
      {LINKS.map((l) => (
        <li key={l.href}>
          <a
            href={l.href}
            className="inline-flex items-center gap-1.5 text-[13px] transition hover:text-[color:var(--color-text)]"
            style={{ color: "var(--color-text-dim)" }}
          >
            <FileText
              size={12}
              strokeWidth={1.75}
              color="var(--color-text-faint)"
              aria-hidden
            />
            {l.label}
          </a>
        </li>
      ))}
      <li>
        <CookieSettingsButton className="inline-flex items-center gap-1.5 text-[13px] transition hover:text-[color:var(--color-text)] text-[color:var(--color-text-dim)]">
          <ShieldCheck
            size={12}
            strokeWidth={1.75}
            color="var(--color-text-faint)"
            aria-hidden
          />
          <span>Cookie-Einstellungen</span>
        </CookieSettingsButton>
      </li>
    </ul>
  );
}
