"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useSyncExternalStore } from "react";
import {
  defaultOrganizations,
  readStoredOrganizations,
  subscribeToStoredOrganizations,
} from "./organizationData";
import SocialLinkBox from "./SocialLinkBox";

const subscribeToHydration = () => () => {};

export default function OrganizationDetailView({ id }: { id: string }) {
  const hasHydrated = useSyncExternalStore(subscribeToHydration, () => true, () => false);
  const organizations = useSyncExternalStore(
    subscribeToStoredOrganizations,
    readStoredOrganizations,
    () => defaultOrganizations
  );
  const organization = organizations.find((entry) => entry.id === id);

  if (!hasHydrated) {
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
