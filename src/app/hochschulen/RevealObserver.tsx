"use client";

import { useEffect } from "react";

// Mirrors the landing page's useScrollReveal (landing-client.tsx). Shared
// components like SectionHeading render with the ".ln-reveal" class, which
// starts at opacity 0 and only becomes visible once "is-visible" is added.
// The landing mounts its own observer inside its client bundle; this page is
// a Server Component, so it mounts this tiny client helper instead.
export default function RevealObserver() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("is-visible");
            obs.unobserve(e.target);
          }
        }
      },
      { threshold: 0.05, rootMargin: "0px 0px 0px 0px" },
    );

    const tracked = new WeakSet<Element>();
    const trackElement = (el: Element) => {
      if (tracked.has(el)) return;
      tracked.add(el);
      obs.observe(el);
      // Safety net: force visible after 1.5s if the observer never fires.
      window.setTimeout(() => {
        if (!el.classList.contains("is-visible")) {
          el.classList.add("is-visible");
          obs.unobserve(el);
        }
      }, 1500);
    };

    const scan = () => {
      document
        .querySelectorAll(".ln-reveal, .hs-reveal")
        .forEach(trackElement);
    };
    scan();

    const mut = new MutationObserver(scan);
    mut.observe(document.body, { childList: true, subtree: true });

    return () => {
      obs.disconnect();
      mut.disconnect();
    };
  }, []);

  return null;
}
