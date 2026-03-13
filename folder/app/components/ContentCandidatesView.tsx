"use client";

import { usePortalContent } from "./portalContentClient";
import {
  CandidateEntry,
  defaultCandidates,
} from "./candidateData";
import {
  defaultOrganizations,
} from "./organizationData";
import TrackedContentLink from "./TrackedContentLink";

const sections: CandidateEntry["category"][] = [
  "Statewide Candidates",
  "Congressional Candidates",
  "State Assembly Candidates",
];

export default function ContentCandidatesView() {
  const { items: candidates } = usePortalContent("candidates", defaultCandidates);
  const { items: organizations } = usePortalContent(
    "organizations",
    defaultOrganizations
  );

  return (
    <>
      {sections.map((section) => {
        const sectionCandidates = candidates.filter((candidate) => candidate.category === section);

        return (
          <section key={section} className="section">
            <h1 className="heading">{section}</h1>
            {sectionCandidates.map((candidate) => (
              <TrackedContentLink
                key={candidate.id}
                href={`/candidates/${candidate.id}`}
                contentKind="candidates"
                contentId={candidate.id}
                title={candidate.title}
                className="card card-link"
              >
                <h2>{candidate.title}</h2>
                {candidate.summary ? <p>{candidate.summary}</p> : null}
              </TrackedContentLink>
            ))}
          </section>
        );
      })}

      <section className="section">
        <h1 className="heading">Featured Organizations</h1>
        {organizations.map((organization) => (
          <TrackedContentLink
            key={organization.id}
            href={`/organizations/${organization.id}`}
            contentKind="organizations"
            contentId={organization.id}
            title={organization.title}
            className="card card-link"
          >
            <h2>{organization.title}</h2>
            {organization.summary ? <p>{organization.summary}</p> : null}
          </TrackedContentLink>
        ))}
      </section>
    </>
  );
}
