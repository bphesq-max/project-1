export type NewsEntry = {
  id: string;
  title: string;
  region: string;
  status: string;
  category: string;
  summary: string;
  body: string;
  storyType?: "article" | "x-post";
  isFeatured?: boolean;
  imageDataUrl?: string;
  sourceUrl?: string;
};

import { createBrowserStore } from "./browserStore";

export const NEWS_STORAGE_KEY = "restore-golden-state-news";

export const defaultStories: NewsEntry[] = [
  {
    id: "state-budget-debate",
    title: "State budget debate sharpens around taxes and affordability",
    region: "Sacramento",
    status: "Draft",
    category: "Policy",
    summary:
      "Use this slot for a homepage story, endorsement release, or rapid response article tied to statewide issues.",
    body:
      "Use this area for the full story body, a press release, or a campaign response tied to statewide issues.",
    isFeatured: true,
  },
  {
    id: "county-activists-volunteer-push",
    title: "County activists organize volunteer push ahead of filing deadlines",
    region: "Central Coast",
    status: "Queued",
    category: "Organization",
    summary:
      "This can hold local updates that support campaigns, events, or organizational announcements.",
    body:
      "This can hold local updates that support campaigns, events, or organizational announcements.",
  },
];

const storyStore = createBrowserStore<NewsEntry[]>({
  storageKey: NEWS_STORAGE_KEY,
  eventName: "portal-news-updated",
  defaultValue: defaultStories,
});

export const readStoredStories = storyStore.readStoredValue;
export const persistStories = storyStore.persistValue;
export const subscribeToStoredStories = storyStore.subscribeToValue;
