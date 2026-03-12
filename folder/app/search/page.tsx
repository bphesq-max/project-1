"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useSyncExternalStore } from "react";
import {
  defaultCandidates,
  readStoredCandidates,
  subscribeToStoredCandidates,
} from "../components/candidateData";
import {
  defaultEvents,
  formatEventDateTime,
  readStoredEvents,
  subscribeToStoredEvents,
} from "../components/eventData";
import {
  defaultStories,
  readStoredStories,
  subscribeToStoredStories,
} from "../components/newsData";
import {
  defaultOrganizations,
  readStoredOrganizations,
  subscribeToStoredOrganizations,
} from "../components/organizationData";
import { buildStoryHref } from "../components/storyHref";

function includesQuery(values: Array<string | undefined>, query: string) {
  if (!query) {
    return true;
  }

  return values
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .includes(query);
}

function SearchPageContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q")?.trim().toLowerCase() ?? "";
  const candidates = useSyncExternalStore(
    subscribeToStoredCandidates,
    readStoredCandidates,
    () => defaultCandidates
  );
  const events = useSyncExternalStore(
    subscribeToStoredEvents,
    readStoredEvents,
    () => defaultEvents
  );
  const stories = useSyncExternalStore(
    subscribeToStoredStories,
    readStoredStories,
    () => defaultStories
  );
  const organizations = useSyncExternalStore(
    subscribeToStoredOrganizations,
    readStoredOrganizations,
    () => defaultOrganizations
  );

  const candidateResults = candidates.filter((candidate) =>
    includesQuery(
      [
        candidate.title,
        candidate.summary,
        candidate.body,
        candidate.category,
        candidate.districtLabels?.join(" "),
      ],
      query
    )
  );
  const eventResults = events.filter((event) =>
    includesQuery(
      [
        event.title,
        event.description,
        event.location,
        event.region,
        event.districtLabels?.join(" "),
      ],
      query
    )
  );
  const storyResults = stories.filter((story) =>
    includesQuery([story.title, story.summary, story.body, story.region], query)
  );
  const organizationResults = organizations.filter((organization) =>
    includesQuery(
      [organization.title, organization.summary, organization.body, organization.region],
      query
    )
  );

  const totalResults =
    candidateResults.length +
    eventResults.length +
    storyResults.length +
    organizationResults.length;

  return (
    <section className="page-stack">
      <div className="section-header">
        <span className="section-kicker">Search</span>
        <h1 className="heading">Search the site</h1>
        <p className="section-intro">
          {query
            ? `${totalResults} result${totalResults === 1 ? "" : "s"} for "${query}".`
            : "Search candidates, organizations, events, and news from one place."}
        </p>
      </div>

      <form className="search-page-form" action="/search" method="get">
        <input
          type="search"
          name="q"
          defaultValue={searchParams.get("q") ?? ""}
          className="search-page-input"
          placeholder="Search candidates, news, events, organizations"
        />
        <button type="submit" className="button">
          Search
        </button>
      </form>

      <section className="section">
        <div className="section-header">
          <span className="section-kicker">Candidates</span>
          <h2 className="heading">Candidate results</h2>
        </div>
        <div className="card-grid">
          {candidateResults.map((candidate) => (
            <Link key={candidate.id} href={`/candidates/${candidate.id}`} target="_blank" rel="noreferrer" className="card card-link">
              <span className="card-tag">{candidate.category}</span>
              <h3>{candidate.title}</h3>
              {candidate.summary ? <p>{candidate.summary}</p> : null}
              {candidate.imageDataUrl ? <img src={candidate.imageDataUrl} alt={candidate.title} className="dashboard-event-image" /> : null}
            </Link>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-header">
          <span className="section-kicker">Events</span>
          <h2 className="heading">Event results</h2>
        </div>
        <div className="card-grid">
          {eventResults.map((event) => (
            <Link key={event.id} href={`/events/${event.id}`} target="_blank" rel="noreferrer" className="card card-link">
              <span className="card-tag">{event.region}</span>
              <h3>{event.title}</h3>
              <p>{event.description}</p>
              <p className="dashboard-meta">{formatEventDateTime(event.date, event.time)}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-header">
          <span className="section-kicker">News</span>
          <h2 className="heading">News results</h2>
        </div>
        <div className="card-grid">
          {storyResults.map((story) => (
            <Link key={story.id} href={buildStoryHref(story.id, story)} target="_blank" rel="noreferrer" className="card card-link">
              <span className="card-tag">{story.region}</span>
              <h3>{story.title}</h3>
              <p>{story.summary}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-header">
          <span className="section-kicker">Organizations</span>
          <h2 className="heading">Organization results</h2>
        </div>
        <div className="card-grid">
          {organizationResults.map((organization) => (
            <Link key={organization.id} href={`/organizations/${organization.id}`} target="_blank" rel="noreferrer" className="card card-link">
              <span className="card-tag">{organization.region}</span>
              <h3>{organization.title}</h3>
              {organization.summary ? <p>{organization.summary}</p> : null}
            </Link>
          ))}
        </div>
      </section>
    </section>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <section className="page-stack">
          <p className="section-intro">Loading search...</p>
        </section>
      }
    >
      <SearchPageContent />
    </Suspense>
  );
}
