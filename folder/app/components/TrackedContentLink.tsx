"use client";

import type { ReactNode } from "react";
import Link from "next/link";

import { trackAnalyticsEvent } from "./analyticsClient";

type ContentKind = "candidates" | "events" | "stories" | "organizations";

const SESSION_KEY = "restore-golden-state-analytics-session";

export default function TrackedContentLink({
  href,
  contentKind,
  contentId,
  title,
  className,
  children,
}: {
  href: string;
  contentKind: ContentKind;
  contentId: string;
  title: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      target="_blank"
      rel="noreferrer"
      className={className}
      onClick={() => {
        if (typeof window === "undefined") {
          return;
        }

        const currentPath = `${window.location.pathname}${window.location.search}`;
        const sessionId =
          window.sessionStorage.getItem(SESSION_KEY) ||
          `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

        window.sessionStorage.setItem(SESSION_KEY, sessionId);

        trackAnalyticsEvent({
          sessionId,
          eventType: "content_click",
          path: currentPath,
          previousPath: currentPath,
          targetPath: href,
          contentKind,
          contentId,
          title,
        });
      }}
    >
      {children}
    </Link>
  );
}
