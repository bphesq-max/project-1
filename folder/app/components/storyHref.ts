import { NewsEntry } from "./newsData";

export function buildStoryHref(id: string, story: Pick<
  NewsEntry,
  "title" | "region" | "status" | "category" | "summary" | "body" | "storyType" | "sourceUrl" | "imageDataUrl"
>) {
  const params = new URLSearchParams({
    title: story.title,
    region: story.region,
    status: story.status,
    category: story.category,
    summary: story.summary,
    body: story.body,
    storyType: story.storyType ?? "article",
  });

  if (story.sourceUrl) {
    params.set("sourceUrl", story.sourceUrl);
  }

  if (story.imageDataUrl) {
    params.set("imageDataUrl", story.imageDataUrl);
  }

  return `/stories/${id}?${params.toString()}`;
}
