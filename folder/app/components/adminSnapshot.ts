"use client";

import { useSyncExternalStore } from "react";
import { defaultCandidates } from "./candidateData";
import { defaultEvents } from "./eventData";
import { defaultStories } from "./newsData";
import {
  defaultOrganizations,
} from "./organizationData";
import { usePortalContent } from "./portalContentClient";
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

export function useAdminSnapshot() {
  const { items: candidates } = usePortalContent("candidates", defaultCandidates);
  const { items: events } = usePortalContent("events", defaultEvents);
  const { items: stories } = usePortalContent("stories", defaultStories);
  const { items: organizations } = usePortalContent(
    "organizations",
    defaultOrganizations
  );
  const memberProfile = useSyncExternalStore(
    subscribeToStoredMemberProfile,
    readStoredMemberProfile,
    () => defaultMemberProfile
  );
  const candidateSubmissions = useSyncExternalStore(
    subscribeToCandidateSubmissions,
    readStoredCandidateSubmissions,
    () => []
  );
  const eventSubmissions = useSyncExternalStore(
    subscribeToEventSubmissions,
    readStoredEventSubmissions,
    () => []
  );
  const organizationSubmissions = useSyncExternalStore(
    subscribeToOrganizationSubmissions,
    readStoredOrganizationSubmissions,
    () => []
  );
  const storySubmissions = useSyncExternalStore(
    subscribeToStorySubmissions,
    readStoredStorySubmissions,
    () => []
  );

  return {
    candidatesCount: candidates.length,
    eventsCount: events.length,
    storiesCount: stories.length,
    organizationsCount: organizations.length,
    pendingCount:
      candidateSubmissions.length +
      eventSubmissions.length +
      organizationSubmissions.length +
      storySubmissions.length,
    memberProfile,
  };
}
