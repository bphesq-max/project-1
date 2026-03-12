"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useEffect, useState } from "react";
import { type CandidateEntry, defaultCandidates } from "./candidateData";
import { readPortalContentClientItem } from "./portalContentClient";
import SocialLinkBox from "./SocialLinkBox";

export default function CandidateDetailView({ id }: { id: string }) {
  const [candidate, setCandidate] = useState<CandidateEntry | null>(
    defaultCandidates.find((entry) => entry.id === id) ?? null
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    readPortalContentClientItem("candidates", id)
      .then((item) => {
        if (isMounted) {
          setCandidate(item ?? null);
        }
      })
      .catch(() => {
        if (isMounted) {
          setCandidate(null);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [id]);

  if (isLoading) {
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
