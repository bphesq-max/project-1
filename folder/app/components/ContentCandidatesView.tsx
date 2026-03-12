"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import {
  CandidateEntry,
  defaultCandidates,
  readStoredCandidates,
  subscribeToStoredCandidates,
} from "./candidateData";
import {
  defaultOrganizations,
  readStoredOrganizations,
  subscribeToStoredOrganizations,
} from "./organizationData";

const sections: CandidateEntry["category"][] = [
  "Statewide Candidates",
  "Congressional Candidates",
  "State Assembly Candidates",
];

export default function ContentCandidatesView() {
  const candidates = useSyncExternalStore(
    subscribeToStoredCandidates,
    readStoredCandidates,
    () => defaultCandidates
  );
  const organizations = useSyncExternalStore(
    subscribeToStoredOrganizations,
    readStoredOrganizations,
    () => defaultOrganizations
  );

  return (
    <>
      {sections.map((section) => {
        const sectionCandidates = candidates.filter((candidate) => candidate.category === section);

        return (
          <section key={section} className="section">
            <h1 className="heading">{section}</h1>
            {sectionCandidates.map((candidate) => (
              <Link key={candidate.id} href={`/candidates/${candidate.id}`} target="_blank" rel="noreferrer" className="card card-link">
                <h2>{candidate.title}</h2>
                {candidate.summary ? <p>{candidate.summary}</p> : null}
              </Link>
            ))}
          </section>
        );
      })}

      <section className="section">
        <h1 className="heading">Featured Organizations</h1>
        {organizations.map((organization) => (
          <Link
            key={organization.id}
            href={`/organizations/${organization.id}`}
            target="_blank"
            rel="noreferrer"
            className="card card-link"
          >
            <h2>{organization.title}</h2>
            {organization.summary ? <p>{organization.summary}</p> : null}
          </Link>
        ))}
      </section>
    </>
  );
}
