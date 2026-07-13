import { type ReactNode } from "react";

// Light "Academic Editorial" section heading for /hochschulen. The shared
// SectionHeading hardcodes white text for the dark landing, so this route
// gets its own: eyebrow in the indigo accent, near-black heading, muted sub.
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
        `hs-reveal max-w-[760px] ${centered ? "mx-auto text-center" : "text-left"} ` +
        (className ?? "")
      }
    >
      {eyebrow && <p className="hs-eyebrow mb-4">{eyebrow}</p>}
      <h2
        className="font-bold leading-[1.12] tracking-[-0.9px]"
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "clamp(28px, 3.6vw, 40px)",
          color: "var(--hs-ink)",
        }}
      >
        {title}
      </h2>
      {sub && (
        <p
          className={`mt-4 max-w-[620px] text-[16px] leading-[1.7] ${centered ? "mx-auto" : ""}`}
          style={{ color: "var(--hs-mute)" }}
        >
          {sub}
        </p>
      )}
    </div>
  );
}
