"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { defaultCandidates, readStoredCandidates, subscribeToStoredCandidates } from "./candidateData";
import SocialLinkBox from "./SocialLinkBox";

const subscribeToHydration = () => () => {};

export default function CandidateDetailView({ id }: { id: string }) {
  const hasHydrated = useSyncExternalStore(subscribeToHydration, () => true, () => false);
  const candidates = useSyncExternalStore(
    subscribeToStoredCandidates,
    readStoredCandidates,
    () => defaultCandidates
  );
  const candidate = candidates.find((entry) => entry.id === id);

  if (!hasHydrated) {
    return <section className="section"><p>Loading candidate...</p></section>;
  }

  if (!candidate) {
    return <section className="section"><p>Candidate not found.</p></section>;
  }

  return (
    <section className="section page-stack">
      <Link href="/content" className="dashboard-inline-button">Back to content</Link>
      <div className="dashboard-panel">
        <span className="card-tag">{candidate.category}</span>
        <h1 className="heading">{candidate.title}</h1>
        {candidate.summary ? <p className="section-intro">{candidate.summary}</p> : null}
        <SocialLinkBox
          xUrl={candidate.xUrl}
          facebookUrl={candidate.facebookUrl}
          instagramUrl={candidate.instagramUrl}
        />
        {candidate.sourceUrl || candidate.imageDataUrl ? (
          <div className="detail-media-block">
            {candidate.sourceUrl ? (
              <a href={candidate.sourceUrl} target="_blank" rel="noreferrer" className="external-link">
                Visit website
              </a>
            ) : null}
            {candidate.imageDataUrl ? <img src={candidate.imageDataUrl} alt={candidate.title} className="detail-image" /> : null}
          </div>
        ) : null}
        {candidate.body ? <p className="detail-body">{candidate.body}</p> : null}
      </div>
    </section>
  );
}
