import { type ReactNode } from "react";

// Light "Academic Editorial" section heading for /hochschulen. The shared
// SectionHeading hardcodes white text for the dark landing, so this route
// gets its own. GradBlueprint treatment: eyebrow as white pill with accent
// dot, big tight Sora heading (700, -0.025em, lh ~1.05), muted sub.
export default function HsSectionHeading({
  eyebrow,
  title,
  sub,
  align = "center",
  className,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  sub?: ReactNode;
  align?: "center" | "left";
  className?: string;
}) {
  const centered = align === "center";
  return (
    <div
      className={
        `hs-reveal max-w-[820px] ${centered ? "mx-auto text-center" : "text-left"} ` +
        (className ?? "")
      }
    >
      {eyebrow && (
        <p className="mb-5">
          <span className="hs-eyebrow-pill">{eyebrow}</span>
        </p>
      )}
      <h2
        className="font-bold"
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "clamp(2rem, 4vw, 3rem)",
          letterSpacing: "-0.025em",
          lineHeight: 1.05,
          color: "var(--hs-ink)",
        }}
      >
        {title}
      </h2>
      {sub && (
        <p
          className={`mt-5 max-w-[640px] text-[16px] leading-[1.65] md:text-[17px] ${centered ? "mx-auto" : ""}`}
          style={{ color: "var(--hs-mute)" }}
        >
          {sub}
        </p>
      )}
    </div>
  );
}
