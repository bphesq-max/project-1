export type PortalEvent = {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  region: string;
  description: string;
  isFeatured?: boolean;
  imageDataUrl?: string;
  sourceUrl?: string;
  districtLabels?: string[];
  zipCodes?: string[];
};

import { createBrowserStore } from "./browserStore";

export const EVENT_STORAGE_KEY = "restore-golden-state-events";

export const defaultEvents: PortalEvent[] = [
  {
    id: "sacramento-fundraiser",
    date: "2026-04-15",
    time: "18:00",
    title: "Sacramento fundraiser",
    location: "Sacramento",
    region: "Statewide",
    description:
      "Evening donor event with statewide candidates and local organizers.",
    isFeatured: true,
  },
  {
    id: "central-coast-rally",
    date: "2026-05-05",
    time: "13:00",
    title: "Central Coast rally",
    location: "Central Coast",
    region: "Central Coast",
    description:
      "Public gathering with speakers, voter registration, and volunteer signups.",
  },
  {
    id: "county-strategy-meeting",
    date: "2026-05-18",
    time: "17:30",
    title: "County strategy meeting",
    location: "Regional HQ",
    region: "Central Valley",
    description:
      "Regional planning session for clubs, campaigns, and coalition partners.",
  },
];

export function sortEvents(events: PortalEvent[]) {
  return [...events].sort((a, b) => {
    const left = `${a.date}T${a.time || "00:00"}`;
    const right = `${b.date}T${b.time || "00:00"}`;
    return left.localeCompare(right);
  });
}

export function formatEventDate(date: string) {
  const parsed = new Date(`${date}T12:00:00`);

  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function formatEventDateTime(date: string, time: string) {
  const parsed = new Date(`${date}T${time || "00:00"}:00`);

  return parsed.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function toDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

const eventStore = createBrowserStore<PortalEvent[]>({
  storageKey: EVENT_STORAGE_KEY,
  eventName: "portal-events-updated",
  defaultValue: defaultEvents,
  normalize: sortEvents,
});

export const readStoredEvents = eventStore.readStoredValue;
export const persistEvents = eventStore.persistValue;
export const subscribeToStoredEvents = eventStore.subscribeToValue;
