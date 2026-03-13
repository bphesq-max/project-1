"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { type NewsEntry, defaultStories } from "./newsData";
import { readPortalContentClientItem } from "./portalContentClient";
import ReactionControls from "./ReactionControls";
import XPostEmbed from "./XPostEmbed";

export default function NewsDetailView({ id }: { id: string }) {
  const searchParams = useSearchParams();
  const fallbackStory = useMemo(
    () =>
      defaultStories.find((entry) => entry.id === id) ??
      (searchParams.get("title")
        ? {
            id,
            title: searchParams.get("title") ?? "",
            region: searchParams.get("region") ?? "Statewide",
            status: searchParams.get("status") ?? "Published",
            category: searchParams.get("category") ?? "Campaign",
            summary: searchParams.get("summary") ?? "",
            body: searchParams.get("body") ?? "",
            storyType:
              (searchParams.get("storyType") as "article" | "x-post" | null) ??
              "article",
            sourceUrl: searchParams.get("sourceUrl") ?? undefined,
            imageDataUrl: searchParams.get("imageDataUrl") ?? undefined,
          }
        : null),
    [id, searchParams]
  );
  const [story, setStory] = useState<NewsEntry | null>(fallbackStory);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    readPortalContentClientItem("stories", id)
      .then((item) => {
        if (isMounted) {
          setStory(item ?? fallbackStory);
        }
      })
      .catch(() => {
        if (isMounted) {
          setStory(fallbackStory);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [fallbackStory, id]);

  if (isLoading) {
    return <section className="section"><p>Loading story...</p></section>;
  }

  if (!story) {
    return <section className="section"><p>Story not found.</p></section>;
  }

  return (
    <section className="section page-stack">
      <Link href="/news" className="dashboard-inline-button">Back to news</Link>
      <div className="dashboard-panel">
        <div className="dashboard-item-tags">
          <span className="card-tag">{story.region}</span>
          <span className="dashboard-badge">{story.status}</span>
        </div>
        <h1 className="heading">{story.title}</h1>
        <p className="section-intro">{story.summary}</p>
        <ReactionControls kind="stories" id={story.id} />
        {story.sourceUrl ? (
          <a href={story.sourceUrl} target="_blank" rel="noreferrer" className="external-link">
            {story.storyType === "x-post" ? "View post on X" : "Read source"}
          </a>
        ) : null}
        {story.storyType === "x-post" && story.sourceUrl ? (
          <XPostEmbed url={story.sourceUrl} />
        ) : story.imageDataUrl ? (
          <img src={story.imageDataUrl} alt={story.title} className="detail-image" />
        ) : null}
        {story.body ? <p className="detail-body">{story.body}</p> : null}
      </div>
    </section>
  );
}
