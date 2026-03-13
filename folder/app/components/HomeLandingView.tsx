"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useSession } from "next-auth/react";
import {
  defaultCandidates,
} from "./candidateData";
import {
  defaultStories,
} from "./newsData";
import {
  defaultEvents,
  formatEventDateTime,
} from "./eventData";
import {
  defaultMemberProfile,
  getRegionForCounty,
  persistMemberProfile,
  readStoredMemberProfile,
  subscribeToStoredMemberProfile,
} from "./memberData";
import { usePortalContent } from "./portalContentClient";
import { buildStoryHref } from "./storyHref";
import XPostEmbed from "./XPostEmbed";
import TrackedContentLink from "./TrackedContentLink";
import RevealOnScroll from "./RevealOnScroll";

function normalizeZip(value?: string) {
  return value?.trim().slice(0, 5) ?? "";
}

export default function HomeLandingView() {
  const { data: session, status } = useSession();
  const [showSignupComplete, setShowSignupComplete] = useState(false);
  const { items: candidates } = usePortalContent("candidates", defaultCandidates);
  const { items: stories } = usePortalContent("stories", defaultStories);
  const { items: events } = usePortalContent("events", defaultEvents);
  const memberProfile = useSyncExternalStore(
    subscribeToStoredMemberProfile,
    readStoredMemberProfile,
    () => defaultMemberProfile
  );
  const memberZip = normalizeZip(memberProfile.zipCode);
  const memberRegion = memberProfile.region ?? getRegionForCounty(memberProfile.county);
  const hasSavedMemberProfile = Boolean(
    memberProfile.county ||
    memberProfile.zipCode ||
    memberProfile.fullName ||
    memberProfile.email
  );
  const hasPersonalization = Boolean(memberProfile.districtConsent && (memberProfile.county || memberZip || memberRegion));

  const featuredCandidates = candidates.filter((candidate) => candidate.isFeatured).slice(0, 3);
  const latestStories = stories.filter((story) => story.isFeatured).slice(0, 3);
  const upcomingEvents = events
    .filter((event) => new Date(`${event.date}T${event.time || "23:59"}:00`) >= new Date())
    .slice(0, 3);

  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.email) {
      return;
    }

    let isMounted = true;

    async function syncProfile() {
      try {
        const response = await fetch("/api/members/profile");
        const data = (await response.json()) as { profile?: typeof memberProfile };

        if (!response.ok || !data.profile || !isMounted) {
          return;
        }

        persistMemberProfile(data.profile);
      } catch {
        return;
      }
    }

    syncProfile();

    return () => {
      isMounted = false;
    };
  }, [session?.user?.email, status]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const hasSignupComplete = window.sessionStorage.getItem(
      "restore-golden-state-signup-complete"
    );

    if (!hasSignupComplete) {
      return;
    }

    window.sessionStorage.removeItem("restore-golden-state-signup-complete");
    const showTimeout = window.setTimeout(() => {
      setShowSignupComplete(true);
    }, 0);

    const hideTimeout = window.setTimeout(() => {
      setShowSignupComplete(false);
    }, 10000);

    return () => {
      window.clearTimeout(showTimeout);
      window.clearTimeout(hideTimeout);
    };
  }, []);

  return (
    <>
      {showSignupComplete ? (
        <div className="signup-complete-toast" role="status" aria-live="polite">
          Sign-Up Complete, Thank You.
        </div>
      ) : null}

      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">California conservatives</span>
          <h1>
            <span>Find your people.</span>
            <span>Know what&apos;s happening.</span>
            <span>Show up informed.</span>
          </h1>
          <p>
            Free access to California candidates, events, news, and organizations.
            No spam. No endless emails. Just one place to stay connected and ready.
          </p>
          <div className="hero-buttons">
            <Link href="/content" className="button">
              Explore California Content
            </Link>
            {!session?.user ? (
              <Link href="/members" className="button button-secondary">
                Join Free
              </Link>
            ) : null}
          </div>
        </div>

        <aside className="hero-panel" aria-label="Platform summary">
          <div className="hero-panel-stat">
            <span className="hero-panel-stat-value">Free</span>
            <p>Open to the public.</p>
          </div>
          <div className="hero-panel-stat">
            <span className="hero-panel-stat-value">Stay Ready</span>
            <p>See what matters without the clutter.</p>
          </div>
          <div className="hero-panel-stat">
            <span className="hero-panel-stat-value">Show Up</span>
            <p>News, events, and candidates together.</p>
          </div>
        </aside>
      </section>

      {hasPersonalization || !hasSavedMemberProfile ? (
      <RevealOnScroll as="section" className="section personalization-section">
        <div className="section-header">
          <span className="section-kicker">Your Districts</span>
          <h2 className="heading">Your California view</h2>
        </div>
        {hasPersonalization ? (
          <div className="personalization-grid reveal-list">
            <div className="card">
              <span className="card-tag">Your candidates</span>
              <h3>0</h3>
              <p>
                Candidate reactions are not live yet. Once members can heart or
                thumbs-up candidates, your saved picks will show here.
              </p>
            </div>
            <div className="card">
              <span className="card-tag">Your district events</span>
              <h3>0</h3>
              <p>
                Personalized event tracking is not live yet. Saved and reacted
                events will appear here once that member feature is built.
              </p>
            </div>
            <div className="card">
              <span className="card-tag">Your region</span>
              <h3>{memberRegion ?? "Choose your county"}</h3>
              <p>
                {memberRegion
                  ? "Your county is mapped to one of the statewide organizing regions."
                  : "Save your county on the member page to place yourself in the right California region."}
              </p>
            </div>
          </div>
        ) : !hasSavedMemberProfile ? (
          <div className="card personalization-empty">
            <span className="card-tag">Customize your experience</span>
            <h3>Choose your county to personalize the site.</h3>
            <p>
              Share only the details you want. Your information stays confidential,
              helps tailor local candidates and events, and you&apos;ll only receive
              emails if you specifically request them.
            </p>
            <Link href="/members" className="button">
              Customize Your Experience
            </Link>
          </div>
        ) : null}
      </RevealOnScroll>
      ) : null}

      <RevealOnScroll as="section" className="section feature-section feature-section-news">
        <div className="section-header">
          <span className="section-kicker">News</span>
          <h2 className="heading">Latest California news</h2>
        </div>
        <div className="card-grid reveal-list">
          {(latestStories.length ? latestStories : stories.slice(0, 3)).map((story) =>
            story.storyType === "x-post" && story.sourceUrl ? (
              <article key={story.id} className="card">
                <span className="card-tag">{story.region}</span>
                <h3>{story.title}</h3>
                <p>{story.summary}</p>
                <XPostEmbed url={story.sourceUrl} />
                <TrackedContentLink
                  href={buildStoryHref(story.id, story)}
                  contentKind="stories"
                  contentId={story.id}
                  title={story.title}
                  className="dashboard-inline-button"
                >
                  Open story page
                </TrackedContentLink>
              </article>
            ) : (
              <TrackedContentLink
                key={story.id}
                href={buildStoryHref(story.id, story)}
                contentKind="stories"
                contentId={story.id}
                title={story.title}
                className="card card-link"
              >
                <span className="card-tag">{story.region}</span>
                <h3>{story.title}</h3>
                <p>{story.summary}</p>
                {story.imageDataUrl ? <img src={story.imageDataUrl} alt={story.title} className="dashboard-event-image" /> : null}
              </TrackedContentLink>
            )
          )}
        </div>
      </RevealOnScroll>

      <RevealOnScroll as="section" className="section feature-section feature-section-candidates">
        <div className="section-header">
          <span className="section-kicker">Candidates</span>
          <h2 className="heading">Featured candidates</h2>
        </div>
        <div className="card-grid reveal-list">
          {(featuredCandidates.length ? featuredCandidates : candidates.slice(0, 3)).map((candidate) => (
            <TrackedContentLink
              key={candidate.id}
              href={`/candidates/${candidate.id}`}
              contentKind="candidates"
              contentId={candidate.id}
              title={candidate.title}
              className="card card-link"
            >
              <span className="card-tag">{candidate.category}</span>
              <h3>{candidate.title}</h3>
              {candidate.summary ? <p>{candidate.summary}</p> : null}
              {candidate.imageDataUrl ? <img src={candidate.imageDataUrl} alt={candidate.title} className="dashboard-event-image" /> : null}
            </TrackedContentLink>
          ))}
        </div>
      </RevealOnScroll>

      <RevealOnScroll as="section" className="section feature-section feature-section-events" stagger>
        <div className="section-header">
          <span className="section-kicker">Events</span>
          <h2 className="heading">Upcoming events</h2>
        </div>
        <div className="card-grid reveal-list">
          {upcomingEvents.map((event) => (
            <TrackedContentLink
              key={event.id}
              href={`/events/${event.id}`}
              contentKind="events"
              contentId={event.id}
              title={event.title}
              className="card card-link"
            >
              <span className="card-tag">{event.region}</span>
              <h3>{event.title}</h3>
              <p>{event.description}</p>
              {event.imageDataUrl ? <img src={event.imageDataUrl} alt={event.title} className="dashboard-event-image" /> : null}
              <p className="dashboard-meta">{formatEventDateTime(event.date, event.time)}</p>
            </TrackedContentLink>
          ))}
        </div>
      </RevealOnScroll>
    </>
  );
}
