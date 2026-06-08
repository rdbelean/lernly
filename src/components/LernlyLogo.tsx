// Single source of truth for the Lernly brand mark. Renders the real logo SVG
// from /public (vector — crisp at any size, tiny file). Use this ANYWHERE Lernly
// is represented as a brand. Never stand in a generic lucide icon for the brand;
// feature icons stay lucide.
type LernlyLogoProps = {
  /** Rendered box size in px (the mark scales to fit, aspect preserved). */
  size?: number;
  /**
   * "symbol" → transparent card-stack mark (default; pairs with the "Lernly"
   * wordmark and sits cleanly on any surface).
   * "icon" → the mark on the indigo app-icon tile (self-contained, for
   * standalone brand moments where a wordmark isn't adjacent).
   */
  variant?: "symbol" | "icon";
  /** Accessible name. Pass "" when a visible "Lernly" wordmark sits next to it. */
  alt?: string;
  className?: string;
};

export default function LernlyLogo({
  size = 40,
  variant = "symbol",
  alt = "Lernly",
  className,
}: LernlyLogoProps) {
  const src =
    variant === "icon" ? "/lernly-logo.svg" : "/lernly-symbol-transparent.svg";
  return (
    // Plain <img>: a static SVG gains nothing from next/image optimization, and
    // this matches the existing nav/footer logo pattern. Centralizing the
    // disable here keeps every call-site clean.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={className}
      aria-hidden={alt === "" ? true : undefined}
    />
  );
}
