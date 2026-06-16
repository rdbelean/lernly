"use client";

import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import {
  ArrowRight,
  Plus,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

// =========================================================================
// PrimaryCTA — the ONE primary-action button. Every "Weiterlernen",
// "Übungsklausur starten", "Neues Paket", "Upgrade" call-to-action must
// route through this component so the deep-indigo fill (#2B3499) can
// never drift back to charcoal again.
// =========================================================================
// Two ways to pass icons:
//   • `leadingIcon={Plus}`             — lucide component ref. Only safe
//                                        from CLIENT components (passing a
//                                        function ref across the RSC
//                                        boundary is rejected by Next.js).
//   • `leadingIconName="plus"`         — serializable string identifier,
//                                        resolved internally. Safe to call
//                                        from SERVER components.
// Both forms exist so client callers can keep the type-safe component
// reference, while server-component callsites (dashboard/page.tsx, etc.)
// pick the string form and don't crash with
// "Functions cannot be passed directly to Client Components."
// =========================================================================

type Size = "sm" | "md" | "lg";

// Keep this registry small and intentional — every new icon needs to land
// here before a server component can use it via string name.
const ICON_BY_NAME = {
  "arrow-right": ArrowRight,
  plus: Plus,
  sparkles: Sparkles,
} as const;
export type PrimaryCTAIconName = keyof typeof ICON_BY_NAME;

type CommonProps = {
  size?: Size;
  leadingIcon?: LucideIcon;
  trailingIcon?: LucideIcon;
  leadingIconName?: PrimaryCTAIconName;
  trailingIconName?: PrimaryCTAIconName;
  eyebrow?: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  fullWidth?: boolean;
  className?: string;
};

const SIZE_PADDING: Record<Size, string> = {
  sm: "12px 16px",
  md: "14px 20px",
  lg: "18px 22px",
};
const SIZE_RADIUS: Record<Size, string> = {
  sm: "12px",
  md: "14px",
  lg: "14px",
};
const SIZE_TITLE: Record<Size, string> = {
  sm: "13px",
  md: "14px",
  lg: "18px",
};
const SIZE_ICON: Record<Size, number> = { sm: 14, md: 16, lg: 20 };

function CTABody({
  size = "md",
  leadingIcon,
  trailingIcon,
  leadingIconName,
  trailingIconName,
  eyebrow,
  subtitle,
  children,
}: Omit<CommonProps, "fullWidth" | "className">) {
  // Resolve string name → icon if provided; otherwise use the direct ref.
  // The string path keeps PrimaryCTA usable from server components.
  const Leading =
    leadingIcon ?? (leadingIconName ? ICON_BY_NAME[leadingIconName] : undefined);
  const Trailing =
    trailingIcon ??
    (trailingIconName ? ICON_BY_NAME[trailingIconName] : undefined);
  const hasHero = Boolean(eyebrow || subtitle);
  return (
    <>
      {Leading && (
        <Leading
          size={SIZE_ICON[size]}
          strokeWidth={2}
          aria-hidden
          className="shrink-0"
        />
      )}
      {hasHero ? (
        <div className="min-w-0 flex-1 text-left">
          {eyebrow && (
            <div
              className="text-[11px] font-semibold uppercase tracking-[0.16em]"
              style={{ color: "rgba(255,255,255,0.70)" }}
            >
              {eyebrow}
            </div>
          )}
          <div
            className="mt-0.5 leading-snug"
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 600,
              fontSize: SIZE_TITLE[size],
              color: "white",
            }}
          >
            {children}
          </div>
          {subtitle && (
            <div
              className="mt-0.5 text-[13px] leading-snug"
              style={{ color: "#A6AEF0" }}
            >
              {subtitle}
            </div>
          )}
        </div>
      ) : (
        <span
          className="min-w-0 flex-1 text-left"
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 600,
            fontSize: SIZE_TITLE[size],
          }}
        >
          {children}
        </span>
      )}
      {Trailing && (
        <span
          aria-hidden
          className="ml-1 inline-flex shrink-0 items-center justify-center rounded-lg"
          style={{
            padding: hasHero ? "8px" : "0",
            background: hasHero ? "rgba(255,255,255,0.14)" : "transparent",
          }}
        >
          <Trailing size={SIZE_ICON[size]} strokeWidth={2} />
        </span>
      )}
    </>
  );
}

const baseStyle = (size: Size, fullWidth: boolean): React.CSSProperties => ({
  background: "#2B3499",
  color: "white",
  borderRadius: SIZE_RADIUS[size],
  padding: SIZE_PADDING[size],
  width: fullWidth ? "100%" : undefined,
});

const baseClass =
  "group inline-flex items-center gap-3 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60";

// Native <button> variant
type ButtonProps = CommonProps &
  Omit<ComponentPropsWithoutRef<"button">, "children" | "className">;
export function PrimaryCTAButton({
  size = "md",
  leadingIcon,
  trailingIcon,
  leadingIconName,
  trailingIconName,
  eyebrow,
  subtitle,
  children,
  fullWidth,
  className,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`${baseClass} ${className ?? ""}`}
      style={baseStyle(size, Boolean(fullWidth))}
      {...rest}
    >
      <CTABody
        size={size}
        leadingIcon={leadingIcon}
        trailingIcon={trailingIcon}
        leadingIconName={leadingIconName}
        trailingIconName={trailingIconName}
        eyebrow={eyebrow}
        subtitle={subtitle}
      >
        {children}
      </CTABody>
    </button>
  );
}

// Anchor variant — same look, semantic <a>
type LinkProps = CommonProps &
  Omit<ComponentPropsWithoutRef<"a">, "children" | "className">;
export function PrimaryCTALink({
  size = "md",
  leadingIcon,
  trailingIcon,
  leadingIconName,
  trailingIconName,
  eyebrow,
  subtitle,
  children,
  fullWidth,
  className,
  href,
  ...rest
}: LinkProps) {
  return (
    <Link
      href={href ?? "#"}
      className={`${baseClass} ${className ?? ""}`}
      style={baseStyle(size, Boolean(fullWidth))}
      {...rest}
    >
      <CTABody
        size={size}
        leadingIcon={leadingIcon}
        trailingIcon={trailingIcon}
        leadingIconName={leadingIconName}
        trailingIconName={trailingIconName}
        eyebrow={eyebrow}
        subtitle={subtitle}
      >
        {children}
      </CTABody>
    </Link>
  );
}

export default PrimaryCTAButton;
