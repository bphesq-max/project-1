"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import { trackAnalyticsEvent } from "./analyticsClient";

const SESSION_KEY = "restore-golden-state-analytics-session";
const LAST_PATH_KEY = "restore-golden-state-last-path";
const EXTERNAL_RECORDED_KEY = "restore-golden-state-referrer-recorded";

function getSessionId() {
  const current = window.sessionStorage.getItem(SESSION_KEY);
  if (current) {
    return current;
  }

  const next = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  window.sessionStorage.setItem(SESSION_KEY, next);
  return next;
}

export default function AnalyticsTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (typeof window === "undefined" || !pathname) {
      return;
    }

    const query = searchParams.toString();
    const currentPath = query ? `${pathname}?${query}` : pathname;
    const previousPath = window.sessionStorage.getItem(LAST_PATH_KEY) || undefined;
    const sessionId = getSessionId();
    const referrerUrl = document.referrer || undefined;
    const referrerHost = referrerUrl ? new URL(referrerUrl).host : undefined;
    const shouldAttachExternalReferrer =
      !previousPath &&
      Boolean(referrerUrl) &&
      !window.sessionStorage.getItem(EXTERNAL_RECORDED_KEY);

    trackAnalyticsEvent({
      sessionId,
      eventType: "page_view",
      path: currentPath,
      previousPath,
      referrerUrl: shouldAttachExternalReferrer ? referrerUrl : undefined,
      referrerHost: shouldAttachExternalReferrer ? referrerHost : undefined,
    });

    if (shouldAttachExternalReferrer) {
      window.sessionStorage.setItem(EXTERNAL_RECORDED_KEY, "1");
    }

    window.sessionStorage.setItem(LAST_PATH_KEY, currentPath);
  }, [pathname, searchParams]);

  return null;
}
