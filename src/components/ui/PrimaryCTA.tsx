"use client";

import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { type LucideIcon } from "lucide-react";

// =========================================================================
// PrimaryCTA — the ONE primary-action button. Every "Weiterlernen",
// "Übungsklausur starten", "Neues Paket", "Upgrade" call-to-action must
// route through this component so the deep-indigo fill (#2B3499) can
// never drift back to charcoal again.
// =========================================================================
// Usage:
//   <PrimaryCTA href="…">Neues Paket</PrimaryCTA>
//   <PrimaryCTA size="lg" leadingIcon={Sparkles} trailingIcon={ArrowRight}
//               eyebrow="Weiterlernen" subtitle="Teste dich im Klausur-Stil">
//     Übungsklausur starten
//   </PrimaryCTA>
// =========================================================================

type Size = "sm" | "md" | "lg";

type CommonProps = {
  size?: Size;
  leadingIcon?: LucideIcon;
  trailingIcon?: LucideIcon;
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
  leadingIcon: Leading,
  trailingIcon: Trailing,
  eyebrow,
  subtitle,
  children,
}: Omit<CommonProps, "fullWidth" | "className">) {
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
  eyebrow,
  subtitle,
  children,
  fullWidth,
  className,
  ...rest
}: LinkProps) {
  return (
    <a
      className={`${baseClass} ${className ?? ""}`}
      style={baseStyle(size, Boolean(fullWidth))}
      {...rest}
    >
      <CTABody
        size={size}
        leadingIcon={leadingIcon}
        trailingIcon={trailingIcon}
        eyebrow={eyebrow}
        subtitle={subtitle}
      >
        {children}
      </CTABody>
    </a>
  );
}

export default PrimaryCTAButton;
