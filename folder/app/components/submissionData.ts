import { CandidateEntry } from "./candidateData";
import { createBrowserStore } from "./browserStore";
import { PortalEvent } from "./eventData";
import { NewsEntry } from "./newsData";
import { OrganizationEntry } from "./organizationData";

export type SubmissionMeta = {
  submissionId: string;
  submitterName: string;
  submitterEmail: string;
  submittedAt: string;
};

export type CandidateSubmission = SubmissionMeta & CandidateEntry;
export type EventSubmission = SubmissionMeta & PortalEvent;
export type OrganizationSubmission = SubmissionMeta & OrganizationEntry;
export type StorySubmission = SubmissionMeta & NewsEntry;

const CANDIDATE_SUBMISSION_STORAGE_KEY = "restore-golden-state-candidate-submissions";
const EVENT_SUBMISSION_STORAGE_KEY = "restore-golden-state-event-submissions";
const ORGANIZATION_SUBMISSION_STORAGE_KEY = "restore-golden-state-organization-submissions";
const STORY_SUBMISSION_STORAGE_KEY = "restore-golden-state-story-submissions";

const candidateStore = createBrowserStore<CandidateSubmission[]>({
  storageKey: CANDIDATE_SUBMISSION_STORAGE_KEY,
  eventName: "portal-candidate-submissions-updated",
  defaultValue: [],
});
const eventStore = createBrowserStore<EventSubmission[]>({
  storageKey: EVENT_SUBMISSION_STORAGE_KEY,
  eventName: "portal-event-submissions-updated",
  defaultValue: [],
});
const organizationStore = createBrowserStore<OrganizationSubmission[]>({
  storageKey: ORGANIZATION_SUBMISSION_STORAGE_KEY,
  eventName: "portal-organization-submissions-updated",
  defaultValue: [],
});
const storyStore = createBrowserStore<StorySubmission[]>({
  storageKey: STORY_SUBMISSION_STORAGE_KEY,
  eventName: "portal-story-submissions-updated",
  defaultValue: [],
});

export const readStoredCandidateSubmissions = candidateStore.readStoredValue;
export const persistCandidateSubmissions = candidateStore.persistValue;
export const subscribeToCandidateSubmissions = candidateStore.subscribeToValue;

export const readStoredEventSubmissions = eventStore.readStoredValue;
export const persistEventSubmissions = eventStore.persistValue;
export const subscribeToEventSubmissions = eventStore.subscribeToValue;

export const readStoredOrganizationSubmissions = organizationStore.readStoredValue;
export const persistOrganizationSubmissions = organizationStore.persistValue;
export const subscribeToOrganizationSubmissions = organizationStore.subscribeToValue;

export const readStoredStorySubmissions = storyStore.readStoredValue;
export const persistStorySubmissions = storyStore.persistValue;
export const subscribeToStorySubmissions = storyStore.subscribeToValue;
