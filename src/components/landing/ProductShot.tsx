"use client";

import Image from "next/image";
import type { CSSProperties } from "react";

/**
 * ProductShot — the single cinematic frame for every real app screenshot on the
 * landing (hero, feature grid, Altklausur spotlight, multilingual proof).
 *
 * Frame rules (one source of truth):
 *  - Subtle ≤6° 3D tilt — rotateX only, NO rotateY, so horizontal content
 *    (quiz options, %-values, scores) never foreshortens or gets clipped.
 *  - Indigo radial glow behind the image that reads as screen-emitted light.
 *  - Raw screenshots carry no chrome, so the frame adds rounded corners + a hair
 *    border + grounding shadow. `phone` wraps the shot in a phone bezel.
 *  - Bleed, when a parent opts in, is bottom-only (parent uses overflow-hidden +
 *    a negative bottom margin) — never sideways.
 *  - next/image with width/height/sizes; priority only for the hero shot.
 */
export default function ProductShot({
  src,
  alt,
  width,
  height,
  sizes,
  priority = false,
  glow = "#2B3499",
  glowStrong = false,
  glowX = "50%",
  glowY = "54%",
  phone = false,
  tilt = "l",
  className = "",
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
  sizes: string;
  priority?: boolean;
  glow?: string;
  glowStrong?: boolean;
  glowX?: string;
  glowY?: string;
  phone?: boolean;
  tilt?: "l" | "r" | "phone";
  className?: string;
}) {
  const image = (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      sizes={sizes}
      priority={priority}
      className={phone ? "ln-ps-phone-img" : "ln-fb-shot"}
    />
  );

  return (
    <div className={`relative ${className}`}>
      <div
        className={`ln-fb-glow ${glowStrong ? "ln-fb-glow--hero" : ""}`}
        style={
          {
            background: `radial-gradient(circle, ${glow} 0%, transparent 70%)`,
            "--fb-gx": glowX,
            "--fb-gy": glowY,
          } as CSSProperties
        }
        aria-hidden
      />
      <div className={`ln-fb-device ln-fb-tilt-${tilt}`}>
        {phone ? <div className="ln-ps-phone mx-auto">{image}</div> : image}
      </div>
    </div>
  );
}
