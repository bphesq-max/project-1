"use client";

export type AnalyticsTrackInput = {
  sessionId: string;
  eventType: "page_view" | "content_click";
  path: string;
  previousPath?: string;
  referrerUrl?: string;
  referrerHost?: string;
  targetPath?: string;
  contentKind?: "candidates" | "events" | "stories" | "organizations";
  contentId?: string;
  title?: string;
};

export function trackAnalyticsEvent(payload: AnalyticsTrackInput) {
  void fetch("/api/analytics/track", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => undefined);
}
