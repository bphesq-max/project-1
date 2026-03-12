"use client";

import Link from "next/link";

import { useAdminSnapshot } from "./adminSnapshot";

export default function AnalyticsClientView() {
  const snapshot = useAdminSnapshot();
  const memberProfile = snapshot.memberProfile;

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
          <span className="stat-value">{memberProfile.county ? 1 : 0}</span>
          <p>Saved member profile on this device</p>
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
            Registered users are still stored locally in the browser today. To keep a secure database of registered users, the next step is moving member profiles into a real backend tied to Google or email sign-in.
          </p>
          <Link href="/members" className="dashboard-inline-button">Review member flow</Link>
        </div>
      </div>
    </section>
  );
}
