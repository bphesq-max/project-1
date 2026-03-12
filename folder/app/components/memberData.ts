export type MemberProfile = {
  fullName?: string;
  email?: string;
  streetAddress?: string;
  zipCode?: string;
  city?: string;
  county?: string;
  region?: string;
  notes?: string;
  districtConsent?: boolean;
  receiveEmails?: boolean;
};

import { createBrowserStore } from "./browserStore";

export const REGION_DEFINITIONS = [
  {
    name: "Region 1 — North West",
    counties: ["Del Norte", "Humboldt", "Mendocino", "Sonoma", "Napa", "Lake", "Solano", "Trinity", "Yolo"],
  },
  {
    name: "Region 2 — North",
    counties: ["Yuba", "Butte", "Sierra", "Plumas", "Lassen", "Nevada", "Shasta", "Tehama", "Glenn", "Colusa", "Sutter", "Modoc", "Siskiyou", "Placer", "El Dorado", "Amador", "Alpine", "Calaveras"],
  },
  {
    name: "Region 3 — Bay Area",
    counties: ["Alameda", "Contra Costa", "San Francisco", "San Mateo", "Santa Clara", "Marin"],
  },
  {
    name: "Region 4 — Central Valley",
    counties: ["Tulare", "Kings", "Fresno", "Madera", "Mariposa", "Tuolumne", "Stanislaus", "Merced", "Kern", "San Joaquin", "Sacramento"],
  },
  {
    name: "Region 5 — Central Coast",
    counties: ["Ventura", "Santa Barbara", "San Luis Obispo", "Monterey", "Santa Cruz", "San Benito"],
  },
  {
    name: "Region 6 — Los Angeles",
    counties: ["Los Angeles"],
  },
  {
    name: "Region 7 — Inland Empire",
    counties: ["Riverside", "San Bernardino", "Inyo", "Mono"],
  },
  {
    name: "Region 8 — South",
    counties: ["San Diego", "Imperial", "Orange"],
  },
] as const;

export const CALIFORNIA_COUNTIES = REGION_DEFINITIONS.flatMap((region) => region.counties).sort(
  (left, right) => left.localeCompare(right)
);
export const REGION_OPTIONS = ["Statewide", ...REGION_DEFINITIONS.map((region) => region.name)];

export function getRegionForCounty(county?: string) {
  const normalizedCounty = county?.trim().toLowerCase();

  if (!normalizedCounty) {
    return undefined;
  }

  return REGION_DEFINITIONS.find((region) =>
    region.counties.some((entry) => entry.toLowerCase() === normalizedCounty)
  )?.name;
}

export const MEMBER_PROFILE_STORAGE_KEY = "restore-golden-state-member-profile";

export const defaultMemberProfile: MemberProfile = {};

const memberStore = createBrowserStore<MemberProfile>({
  storageKey: MEMBER_PROFILE_STORAGE_KEY,
  eventName: "portal-member-updated",
  defaultValue: defaultMemberProfile,
  normalize: (profile) => ({
    ...profile,
    region: getRegionForCounty(profile.county),
  }),
});

export const readStoredMemberProfile = memberStore.readStoredValue;
export const persistMemberProfile = memberStore.persistValue;
export const subscribeToStoredMemberProfile = memberStore.subscribeToValue;
