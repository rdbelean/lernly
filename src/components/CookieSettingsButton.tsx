"use client";

import type { ReactNode } from "react";
import { openCookiePreferences } from "@/lib/consent";

export default function CookieSettingsButton({
  className,
  children,
}: {
  className?: string;
  children?: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={() => openCookiePreferences()}
      className={className}
    >
      {children ?? "Cookie-Einstellungen"}
    </button>
  );
}
