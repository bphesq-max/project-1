"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  defaultOrganizations,
  type OrganizationEntry,
} from "./organizationData";
import { readPortalContentClientItem } from "./portalContentClient";
import ReactionControls from "./ReactionControls";
import SocialLinkBox from "./SocialLinkBox";

export default function OrganizationDetailView({ id }: { id: string }) {
  const [organization, setOrganization] = useState<OrganizationEntry | null>(
    defaultOrganizations.find((entry) => entry.id === id) ?? null
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    readPortalContentClientItem("organizations", id)
      .then((item) => {
        if (isMounted) {
          setOrganization(item ?? null);
        }
      })
      .catch(() => {
        if (isMounted) {
          setOrganization(null);
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
    return (
      <section className="section">
        <p>Loading organization...</p>
      </section>
    );
  }

  if (!organization) {
    return (
      <section className="section">
        <p>Organization not found.</p>
      </section>
    );
  }

  return (
    <section className="section page-stack">
      <Link href="/content" className="dashboard-inline-button">
        Back to content
      </Link>
      <div className="dashboard-panel">
        {organization.region ? <span className="card-tag">{organization.region}</span> : null}
        <h1 className="heading">{organization.title}</h1>
        {organization.summary ? <p className="section-intro">{organization.summary}</p> : null}
        <ReactionControls kind="organizations" id={organization.id} />
        {organization.sourceUrl ? (
          <a href={organization.sourceUrl} target="_blank" rel="noreferrer" className="external-link">
            Visit website
          </a>
        ) : null}
        <SocialLinkBox
          xUrl={organization.xUrl}
          facebookUrl={organization.facebookUrl}
          instagramUrl={organization.instagramUrl}
        />
        {organization.imageDataUrl ? (
          <img
            src={organization.imageDataUrl}
            alt={organization.title}
            className="detail-image"
          />
        ) : null}
        {organization.body ? <p className="detail-body">{organization.body}</p> : null}
      </div>
    </section>
  );
}
