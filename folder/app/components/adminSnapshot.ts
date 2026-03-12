"use client";

import { useSyncExternalStore } from "react";
import { defaultCandidates, readStoredCandidates, subscribeToStoredCandidates } from "./candidateData";
import { defaultEvents, readStoredEvents, subscribeToStoredEvents } from "./eventData";
import { defaultStories, readStoredStories, subscribeToStoredStories } from "./newsData";
import {
  defaultOrganizations,
  readStoredOrganizations,
  subscribeToStoredOrganizations,
} from "./organizationData";
import { defaultMemberProfile, readStoredMemberProfile, subscribeToStoredMemberProfile } from "./memberData";
import {
  readStoredCandidateSubmissions,
  readStoredEventSubmissions,
  readStoredOrganizationSubmissions,
  readStoredStorySubmissions,
  subscribeToCandidateSubmissions,
  subscribeToEventSubmissions,
  subscribeToOrganizationSubmissions,
  subscribeToStorySubmissions,
} from "./submissionData";

export type AdminSnapshot = {
  candidatesCount: number;
  eventsCount: number;
  storiesCount: number;
  organizationsCount: number;
  pendingCount: number;
  memberProfile: typeof defaultMemberProfile;
};

const defaultSnapshot: AdminSnapshot = {
  candidatesCount: defaultCandidates.length,
  eventsCount: defaultEvents.length,
  storiesCount: defaultStories.length,
  organizationsCount: defaultOrganizations.length,
  pendingCount: 0,
  memberProfile: defaultMemberProfile,
};

let cachedSnapshot = defaultSnapshot;

function getAdminSnapshot(): AdminSnapshot {
  const candidateSubmissions = readStoredCandidateSubmissions();
  const eventSubmissions = readStoredEventSubmissions();
  const organizationSubmissions = readStoredOrganizationSubmissions();
  const storySubmissions = readStoredStorySubmissions();
  const memberProfile = readStoredMemberProfile();

  const nextSnapshot: AdminSnapshot = {
    candidatesCount: readStoredCandidates().length,
    eventsCount: readStoredEvents().length,
    storiesCount: readStoredStories().length,
    organizationsCount: readStoredOrganizations().length,
    pendingCount:
      candidateSubmissions.length +
      eventSubmissions.length +
      organizationSubmissions.length +
      storySubmissions.length,
    memberProfile,
  };

  if (
    cachedSnapshot.candidatesCount === nextSnapshot.candidatesCount &&
    cachedSnapshot.eventsCount === nextSnapshot.eventsCount &&
    cachedSnapshot.storiesCount === nextSnapshot.storiesCount &&
    cachedSnapshot.organizationsCount === nextSnapshot.organizationsCount &&
    cachedSnapshot.pendingCount === nextSnapshot.pendingCount &&
    cachedSnapshot.memberProfile === nextSnapshot.memberProfile
  ) {
    return cachedSnapshot;
  }

  cachedSnapshot = nextSnapshot;
  return cachedSnapshot;
}

function subscribeToAdminSnapshot(onChange: () => void) {
  const unsubscribers = [
    subscribeToStoredCandidates(onChange),
    subscribeToStoredEvents(onChange),
    subscribeToStoredStories(onChange),
    subscribeToStoredOrganizations(onChange),
    subscribeToStoredMemberProfile(onChange),
    subscribeToCandidateSubmissions(onChange),
    subscribeToEventSubmissions(onChange),
    subscribeToOrganizationSubmissions(onChange),
    subscribeToStorySubmissions(onChange),
  ];

  return () => {
    unsubscribers.forEach((unsubscribe) => unsubscribe());
  };
}

export function useAdminSnapshot() {
  return useSyncExternalStore(
    subscribeToAdminSnapshot,
    getAdminSnapshot,
    () => defaultSnapshot
  );
}
