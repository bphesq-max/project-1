export type CandidateEntry = {
  id: string;
  title: string;
  category: "Statewide Candidates" | "Congressional Candidates" | "State Assembly Candidates";
  summary?: string;
  body?: string;
  isFeatured?: boolean;
  imageDataUrl?: string;
  sourceUrl?: string;
  xUrl?: string;
  facebookUrl?: string;
  instagramUrl?: string;
  districtLabels?: string[];
  zipCodes?: string[];
};

import { createBrowserStore } from "./browserStore";

export const CANDIDATE_STORAGE_KEY = "restore-golden-state-candidates";

export const defaultCandidates: CandidateEntry[] = [
  { id: "chad-bianco", title: "Chad Bianco for Governor", category: "Statewide Candidates", isFeatured: true },
  { id: "steve-hilton", title: "Steve Hilton for Governor", category: "Statewide Candidates" },
  { id: "gloria-romero", title: "Gloria Romero for Lt. Governor", category: "Statewide Candidates", isFeatured: true },
  {
    id: "sonja-shaw",
    title: "Sonja Shaw for Superintendent of Public Instruction",
    category: "Statewide Candidates",
  },
  {
    id: "stacy-korsgaden",
    title: "Stacy Korsgaden for Insurance Commissioner",
    category: "Statewide Candidates",
  },
  { id: "peter-verbica", title: "Peter Verbica for CD 19", category: "Congressional Candidates", districtLabels: ["CD 19"] },
  { id: "shane-lewis", title: "Shane Lewis for CD 18", category: "Congressional Candidates", districtLabels: ["CD 18"] },
  { id: "dennis-sanchez", title: "Dennis Sanchez for AD29", category: "State Assembly Candidates", districtLabels: ["AD 29"] },
  { id: "shannon-kessler", title: "Shannon Kessler for AD30", category: "State Assembly Candidates", districtLabels: ["AD 30"] },
];

const candidateStore = createBrowserStore<CandidateEntry[]>({
  storageKey: CANDIDATE_STORAGE_KEY,
  eventName: "portal-candidates-updated",
  defaultValue: defaultCandidates,
});

export const readStoredCandidates = candidateStore.readStoredValue;
export const persistCandidates = candidateStore.persistValue;
export const subscribeToStoredCandidates = candidateStore.subscribeToValue;
