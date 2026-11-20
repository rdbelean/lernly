"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import {
  syncAnalyticsConsent,
  trackPageview,
} from "@/lib/analytics";
import { hasAnalyticsConsent, subscribeConsent } from "@/lib/consent";

function PageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    syncAnalyticsConsent(hasAnalyticsConsent());
    return subscribeConsent((consent) => {
      syncAnalyticsConsent(consent?.analytics === true);
    });
  }, []);

  useEffect(() => {
    if (!pathname || !hasAnalyticsConsent()) return;
    const qs = searchParams?.toString();
    const url = qs ? `${pathname}?${qs}` : pathname;
    trackPageview(url);
  }, [pathname, searchParams]);

  return null;
}

export default function AnalyticsProvider() {
  return (
    <Suspense fallback={null}>
      <PageViewTracker />
    </Suspense>
  );
}
