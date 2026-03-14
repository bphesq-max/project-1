"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { useAdminSnapshot } from "./adminSnapshot";

type ReactionSummaryItem = {
  contentKind: "candidates" | "events" | "stories" | "organizations";
  contentId: string;
  title: string;
  heartCount: number;
  thumbsUpCount: number;
  thumbsDownCount: number;
};

type AnalyticsSummaryItem = {
  label: string;
  count: number;
};

type ContentClickSummaryItem = {
  contentKind: "candidates" | "events" | "stories" | "organizations";
  contentId: string;
  title: string;
  targetPath: string;
  count: number;
};

type PathTransitionItem = {
  fromPath: string;
  toPath: string;
  count: number;
};

type BallotAnalyticsSummary = {
  totalSavedAddresses: number;
  totalSavedBallots: number;
  activeElectionName: string;
  byCounty: AnalyticsSummaryItem[];
  byRegion: AnalyticsSummaryItem[];
};

export default function AnalyticsClientView() {
  const snapshot = useAdminSnapshot();
  const memberProfile = snapshot.memberProfile;
  const [reactions, setReactions] = useState<ReactionSummaryItem[]>([]);
  const [analytics, setAnalytics] = useState<{
    totalPageViews: number;
    totalContentClicks: number;
    topReferrers: AnalyticsSummaryItem[];
    topEntryPages: AnalyticsSummaryItem[];
    topViewedPages: AnalyticsSummaryItem[];
    topTransitions: PathTransitionItem[];
    topContentClicks: ContentClickSummaryItem[];
    ballotAnalytics: BallotAnalyticsSummary;
  }>({
    totalPageViews: 0,
    totalContentClicks: 0,
    topReferrers: [],
    topEntryPages: [],
    topViewedPages: [],
    topTransitions: [],
    topContentClicks: [],
    ballotAnalytics: {
      totalSavedAddresses: 0,
      totalSavedBallots: 0,
      activeElectionName: "Current California ballot profile",
      byCounty: [],
      byRegion: [],
    },
  });

  useEffect(() => {
    let isMounted = true;

    fetch("/api/admin/reactions", { cache: "no-store" })
      .then(async (response) => {
        const data = (await response.json()) as {
          reactions?: ReactionSummaryItem[];
        };

        if (isMounted && response.ok) {
          setReactions(data.reactions ?? []);
        }
      })
      .catch(() => {
        if (isMounted) {
          setReactions([]);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    fetch("/api/admin/analytics", { cache: "no-store" })
      .then(async (response) => {
        const data = (await response.json()) as {
          totalPageViews?: number;
          totalContentClicks?: number;
          topReferrers?: AnalyticsSummaryItem[];
          topEntryPages?: AnalyticsSummaryItem[];
          topViewedPages?: AnalyticsSummaryItem[];
          topTransitions?: PathTransitionItem[];
          topContentClicks?: ContentClickSummaryItem[];
          ballotAnalytics?: BallotAnalyticsSummary;
        };

        if (isMounted && response.ok) {
          setAnalytics({
            totalPageViews: data.totalPageViews ?? 0,
            totalContentClicks: data.totalContentClicks ?? 0,
            topReferrers: data.topReferrers ?? [],
            topEntryPages: data.topEntryPages ?? [],
            topViewedPages: data.topViewedPages ?? [],
            topTransitions: data.topTransitions ?? [],
            topContentClicks: data.topContentClicks ?? [],
            ballotAnalytics: data.ballotAnalytics ?? {
              totalSavedAddresses: 0,
              totalSavedBallots: 0,
              activeElectionName: "Current California ballot profile",
              byCounty: [],
              byRegion: [],
            },
          });
        }
      })
      .catch(() => {
        if (isMounted) {
          setAnalytics({
            totalPageViews: 0,
            totalContentClicks: 0,
            topReferrers: [],
            topEntryPages: [],
            topViewedPages: [],
            topTransitions: [],
            topContentClicks: [],
            ballotAnalytics: {
              totalSavedAddresses: 0,
              totalSavedBallots: 0,
              activeElectionName: "Current California ballot profile",
              byCounty: [],
              byRegion: [],
            },
          });
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <section className="section page-stack">
      <div className="section-header">
        <span className="section-kicker">Analytics</span>
        <h1 className="heading">Site overview</h1>
        <p className="section-intro">
          Local analytics and admin visibility for published content, pending submissions, and member setup.
        </p>
      </div>

      <div className="stats">
        <div className="stat-card">
          <span className="stat-value">{analytics.totalPageViews}</span>
          <p>Tracked page views</p>
        </div>
        <div className="stat-card">
          <span className="stat-value">{analytics.totalContentClicks}</span>
          <p>Tracked content clicks</p>
        </div>
        <div className="stat-card">
          <span className="stat-value">{snapshot.candidatesCount}</span>
          <p>Published candidates</p>
        </div>
        <div className="stat-card">
          <span className="stat-value">{snapshot.eventsCount}</span>
          <p>Published events</p>
        </div>
        <div className="stat-card">
          <span className="stat-value">{snapshot.storiesCount}</span>
          <p>Published stories</p>
        </div>
        <div className="stat-card">
          <span className="stat-value">{snapshot.organizationsCount}</span>
          <p>Published organizations</p>
        </div>
        <div className="stat-card">
          <span className="stat-value">{snapshot.pendingCount}</span>
          <p>Pending submissions</p>
        </div>
        <div className="stat-card">
          <span className="stat-value">{analytics.ballotAnalytics.totalSavedAddresses}</span>
          <p>Saved ballot addresses</p>
        </div>
        <div className="stat-card">
          <span className="stat-value">{analytics.ballotAnalytics.totalSavedBallots}</span>
          <p>Saved ballots</p>
        </div>
      </div>

      <div className="dashboard-panel page-stack">
        <div>
          <h2 className="panel-title">Traffic sources</h2>
          <p className="section-intro">
            Track where visitors came from, which pages they landed on, and the
            most-viewed destinations across the site.
          </p>
        </div>
        <div className="dashboard-grid">
          <div className="dashboard-panel">
            <h3 className="panel-title">Top referrers</h3>
            <div className="stack-list">
              {analytics.topReferrers.length ? analytics.topReferrers.map((item) => (
                <div key={item.label} className="dashboard-item">
                  <h3>{item.label}</h3>
                  <p className="dashboard-meta">{item.count} visit{item.count === 1 ? "" : "s"}</p>
                </div>
              )) : <p className="section-intro">No external referrers recorded yet.</p>}
            </div>
          </div>
          <div className="dashboard-panel">
            <h3 className="panel-title">Top entry pages</h3>
            <div className="stack-list">
              {analytics.topEntryPages.length ? analytics.topEntryPages.map((item) => (
                <div key={item.label} className="dashboard-item">
                  <h3>{item.label}</h3>
                  <p className="dashboard-meta">{item.count} landing visit{item.count === 1 ? "" : "s"}</p>
                </div>
              )) : <p className="section-intro">No landing pages recorded yet.</p>}
            </div>
          </div>
          <div className="dashboard-panel">
            <h3 className="panel-title">Most viewed pages</h3>
            <div className="stack-list">
              {analytics.topViewedPages.length ? analytics.topViewedPages.map((item) => (
                <div key={item.label} className="dashboard-item">
                  <h3>{item.label}</h3>
                  <p className="dashboard-meta">{item.count} page view{item.count === 1 ? "" : "s"}</p>
                </div>
              )) : <p className="section-intro">No page views recorded yet.</p>}
            </div>
          </div>
        </div>
      </div>

      <div className="dashboard-panel page-stack">
        <div>
          <h2 className="panel-title">User journeys</h2>
          <p className="section-intro">
            Follow the common path people take through the site and which content
            cards are driving the most deeper clicks.
          </p>
        </div>
        <div className="dashboard-grid">
          <div className="dashboard-panel">
            <h3 className="panel-title">Common path transitions</h3>
            <div className="stack-list">
              {analytics.topTransitions.length ? analytics.topTransitions.map((item) => (
                <div key={`${item.fromPath}-${item.toPath}`} className="dashboard-item">
                  <h3>{item.fromPath} → {item.toPath}</h3>
                  <p className="dashboard-meta">{item.count} transition{item.count === 1 ? "" : "s"}</p>
                </div>
              )) : <p className="section-intro">No navigation paths recorded yet.</p>}
            </div>
          </div>
          <div className="dashboard-panel">
            <h3 className="panel-title">Top content clicks</h3>
            <div className="stack-list">
              {analytics.topContentClicks.length ? analytics.topContentClicks.map((item) => (
                <div key={`${item.contentKind}-${item.contentId}`} className="dashboard-item">
                  <div className="dashboard-item-top">
                    <div className="dashboard-item-tags">
                      <span className="card-tag">{item.contentKind}</span>
                    </div>
                  </div>
                  <h3>{item.title}</h3>
                  <p className="dashboard-meta">{item.targetPath}</p>
                  <p className="dashboard-meta">{item.count} click{item.count === 1 ? "" : "s"}</p>
                </div>
              )) : <p className="section-intro">No content clicks recorded yet.</p>}
            </div>
          </div>
        </div>
      </div>

      <div className="dashboard-panel page-stack">
        <div>
          <h2 className="panel-title">Ballot geography</h2>
          <p className="section-intro">
            Private counts showing where California members have saved ballot
            addresses and optional ballot snapshots for {analytics.ballotAnalytics.activeElectionName}.
          </p>
        </div>
        <div className="dashboard-grid">
          <div className="dashboard-panel">
            <h3 className="panel-title">Members by county</h3>
            <div className="stack-list">
              {analytics.ballotAnalytics.byCounty.length ? analytics.ballotAnalytics.byCounty.map((item) => (
                <div key={item.label} className="dashboard-item">
                  <h3>{item.label}</h3>
                  <p className="dashboard-meta">{item.count} saved address{item.count === 1 ? "" : "es"}</p>
                </div>
              )) : <p className="section-intro">No saved ballot counties yet.</p>}
            </div>
          </div>
          <div className="dashboard-panel">
            <h3 className="panel-title">Members by region</h3>
            <div className="stack-list">
              {analytics.ballotAnalytics.byRegion.length ? analytics.ballotAnalytics.byRegion.map((item) => (
                <div key={item.label} className="dashboard-item">
                  <h3>{item.label}</h3>
                  <p className="dashboard-meta">{item.count} saved address{item.count === 1 ? "" : "es"}</p>
                </div>
              )) : <p className="section-intro">No saved ballot regions yet.</p>}
            </div>
          </div>
        </div>
      </div>

      <div className="dashboard-panel page-stack">
        <div>
          <h2 className="panel-title">Member profile status</h2>
          <p className="section-intro">
            Current browser profile: {memberProfile.county ? `${memberProfile.county}${memberProfile.region ? `, ${memberProfile.region}` : ""}` : "No county saved yet"}.
          </p>
        </div>
        <div>
          <h2 className="panel-title">Secure database next step</h2>
          <p className="section-intro">
            Member accounts and published content now run through the production
            database. The next refinement after this ballot layer is connecting
            an official precinct-level California election feed.
          </p>
          <div className="dashboard-inline-actions">
            <Link href="/members" className="dashboard-inline-button">Review member flow</Link>
            <Link href="/ballot" className="dashboard-inline-button">Open ballot finder</Link>
          </div>
        </div>
      </div>

      <div className="dashboard-panel page-stack">
        <div>
          <h2 className="panel-title">Private reaction totals</h2>
          <p className="section-intro">
            Reaction counts are private to admins. Members only see their own selected
            reaction on each candidate, event, story, or organization.
          </p>
        </div>
        <div className="stack-list">
          {reactions.length ? (
            reactions.map((reaction) => (
              <div key={`${reaction.contentKind}-${reaction.contentId}`} className="dashboard-item">
                <div className="dashboard-item-top">
                  <div className="dashboard-item-tags">
                    <span className="card-tag">{reaction.contentKind}</span>
                  </div>
                </div>
                <h3>{reaction.title}</h3>
                <p className="dashboard-meta">
                  Hearts: {reaction.heartCount} · Thumbs up: {reaction.thumbsUpCount} ·
                  Thumbs down: {reaction.thumbsDownCount}
                </p>
              </div>
            ))
          ) : (
            <p className="section-intro">No reactions have been recorded yet.</p>
          )}
        </div>
      </div>
    </section>
  );
}
