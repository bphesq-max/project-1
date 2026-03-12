"use client";

import { useEffect, useMemo, useState } from "react";

import {
  type CandidateEntry,
  CANDIDATE_STORAGE_KEY,
} from "./candidateData";
import { type PortalEvent, EVENT_STORAGE_KEY } from "./eventData";
import { type NewsEntry, NEWS_STORAGE_KEY } from "./newsData";
import {
  ORGANIZATION_STORAGE_KEY,
  type OrganizationEntry,
} from "./organizationData";
import { savePortalContentItem } from "./portalContentClient";

type LegacySnapshot = {
  candidates: CandidateEntry[];
  events: PortalEvent[];
  stories: NewsEntry[];
  organizations: OrganizationEntry[];
};

const emptySnapshot: LegacySnapshot = {
  candidates: [],
  events: [],
  stories: [],
  organizations: [],
};

function readLegacyArray<T>(storageKey: string) {
  if (typeof window === "undefined") {
    return [] as T[];
  }

  const raw = window.localStorage.getItem(storageKey);

  if (!raw) {
    return [] as T[];
  }

  try {
    const parsed = JSON.parse(raw) as T[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [] as T[];
  }
}

async function importAllLegacyContent(snapshot: LegacySnapshot) {
  const operations = [
    ...snapshot.candidates.map((item) => savePortalContentItem("candidates", item)),
    ...snapshot.events.map((item) => savePortalContentItem("events", item)),
    ...snapshot.stories.map((item) => savePortalContentItem("stories", item)),
    ...snapshot.organizations.map((item) =>
      savePortalContentItem("organizations", item)
    ),
  ];

  const results = await Promise.allSettled(operations);
  const failed = results.filter((result) => result.status === "rejected");

  return {
    importedCount: results.length - failed.length,
    failedCount: failed.length,
    firstError:
      failed[0]?.status === "rejected"
        ? failed[0].reason instanceof Error
          ? failed[0].reason.message
          : "One or more legacy items could not be imported."
        : null,
  };
}

export default function LegacyContentImport() {
  const [snapshot, setSnapshot] = useState<LegacySnapshot>(emptySnapshot);
  const [message, setMessage] = useState("");
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    setSnapshot({
      candidates: readLegacyArray<CandidateEntry>(CANDIDATE_STORAGE_KEY),
      events: readLegacyArray<PortalEvent>(EVENT_STORAGE_KEY),
      stories: readLegacyArray<NewsEntry>(NEWS_STORAGE_KEY),
      organizations: readLegacyArray<OrganizationEntry>(ORGANIZATION_STORAGE_KEY),
    });
  }, []);

  const totalItems = useMemo(
    () =>
      snapshot.candidates.length +
      snapshot.events.length +
      snapshot.stories.length +
      snapshot.organizations.length,
    [snapshot]
  );

  const handleImport = async () => {
    if (!totalItems) {
      setMessage("No legacy browser content was found on this device.");
      return;
    }

    setIsImporting(true);
    setMessage("");

    try {
      const result = await importAllLegacyContent(snapshot);
      setMessage(
        result.failedCount
          ? `Imported ${result.importedCount} of ${totalItems} legacy items. ${result.firstError ?? "Some items could not be imported."}`
          : `Imported ${result.importedCount} legacy item${result.importedCount === 1 ? "" : "s"} into the live database-backed store. Refresh the dashboard and public site to confirm.`
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to import legacy content."
      );
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <section className="dashboard-panel">
      <div className="panel-header">
        <h2 className="panel-title">Legacy Content Import</h2>
        <span className="dashboard-badge">{totalItems} found</span>
      </div>

      <p className="calendar-empty-copy">
        Use this one time to import older browser-stored candidates, events, news,
        and organizations into the new live content system. This only works if the
        old content still exists in this browser&apos;s local storage.
      </p>

      <div className="stats">
        <div className="stat-card">
          <span className="stat-value">{snapshot.candidates.length}</span>
          <p>Candidates</p>
        </div>
        <div className="stat-card">
          <span className="stat-value">{snapshot.events.length}</span>
          <p>Events</p>
        </div>
        <div className="stat-card">
          <span className="stat-value">{snapshot.stories.length}</span>
          <p>Stories</p>
        </div>
        <div className="stat-card">
          <span className="stat-value">{snapshot.organizations.length}</span>
          <p>Organizations</p>
        </div>
      </div>

      <div className="dashboard-form-actions">
        <button
          type="button"
          className="button"
          onClick={handleImport}
          disabled={isImporting}
        >
          {isImporting ? "Importing..." : "Import Legacy Browser Content"}
        </button>
      </div>

      {message ? <p className="calendar-empty-copy">{message}</p> : null}
    </section>
  );
}
