export type OrganizationEntry = {
  id: string;
  title: string;
  summary?: string;
  isFeatured?: boolean;
  imageDataUrl?: string;
  sourceUrl?: string;
  body?: string;
  region?: string;
  xUrl?: string;
  facebookUrl?: string;
  instagramUrl?: string;
};

import { createBrowserStore } from "./browserStore";

export const ORGANIZATION_STORAGE_KEY = "restore-golden-state-organizations";

export const defaultOrganizations: OrganizationEntry[] = [
  { id: "cagop", title: "CAGOP", isFeatured: true },
  { id: "california-congress-of-republicans", title: "California Congress of Republicans" },
  { id: "california-republican-assembly", title: "California Republican Assembly", isFeatured: true },
];

const organizationStore = createBrowserStore<OrganizationEntry[]>({
  storageKey: ORGANIZATION_STORAGE_KEY,
  eventName: "portal-organizations-updated",
  defaultValue: defaultOrganizations,
});

export const readStoredOrganizations = organizationStore.readStoredValue;
export const persistOrganizations = organizationStore.persistValue;
export const subscribeToStoredOrganizations = organizationStore.subscribeToValue;
