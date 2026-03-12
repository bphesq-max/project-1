"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    twttr?: {
      widgets?: {
        createTweet: (
          tweetId: string,
          element: HTMLElement,
          options?: Record<string, string | boolean>
        ) => Promise<HTMLElement>;
      };
    };
  }
}

function extractTweetId(url: string) {
  const match = url.match(/status\/(\d+)/i);
  return match?.[1] ?? null;
}

function normalizeTweetUrl(url: string) {
  return url.replace("x.com/", "twitter.com/");
}

function loadTwitterWidgetsScript() {
  return new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector(
      'script[src="https://platform.twitter.com/widgets.js"]'
    ) as HTMLScriptElement | null;

    if (window.twttr?.widgets?.createTweet) {
      resolve();
      return;
    }

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener("error", () => reject(new Error("Unable to load X widget.")), {
        once: true,
      });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://platform.twitter.com/widgets.js";
    script.async = true;
    script.charset = "utf-8";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Unable to load X widget."));
    document.body.appendChild(script);
  });
}

export default function XPostEmbed({ url }: { url: string }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const tweetId = extractTweetId(url);
  const failed = !tweetId || failedUrl === url;

  useEffect(() => {
    const container = containerRef.current;

    if (!tweetId || !container) {
      return;
    }

    let cancelled = false;
    container.innerHTML = "";

    loadTwitterWidgetsScript()
      .then(() => {
        if (cancelled || !window.twttr?.widgets?.createTweet || !containerRef.current) {
          return;
        }

        return window.twttr.widgets.createTweet(tweetId, containerRef.current, {
          align: "center",
          dnt: true,
          theme: "light",
        });
      })
      .catch(() => {
        if (!cancelled) {
          setFailedUrl(url);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [tweetId, url]);

  return (
    <div className="x-embed-shell">
      <div ref={containerRef} className="x-embed-container" />
      {failed ? (
        <a href={normalizeTweetUrl(url)} target="_blank" rel="noreferrer" className="external-link">
          View this post on X
        </a>
      ) : null}
    </div>
  );
}
