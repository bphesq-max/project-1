"use client";

import { useState } from "react";
import { useAdminSnapshot } from "./adminSnapshot";
import DashboardCandidateManager from "./DashboardCandidateManager";
import DashboardEventManager from "./DashboardEventManager";
import DashboardMemberManager from "./DashboardMemberManager";
import DashboardNewsManager from "./DashboardNewsManager";
import DashboardOrganizationManager from "./DashboardOrganizationManager";

type AdminTab = "events" | "candidates" | "organizations" | "news" | "members";

const tabs: Array<{ id: AdminTab; label: string }> = [
  { id: "events", label: "Events" },
  { id: "candidates", label: "Candidates" },
  { id: "organizations", label: "Organizations" },
  { id: "news", label: "News Stories" },
  { id: "members", label: "Members" },
];

export default function DashboardAdminTabs() {
  const [activeTab, setActiveTab] = useState<AdminTab>("events");
  const snapshot = useAdminSnapshot();

  return (
    <section className="page-stack">
      <div className="stats">
        <div className="stat-card">
          <span className="stat-value">{snapshot.storiesCount}</span>
          <p>Published stories</p>
        </div>
        <div className="stat-card">
          <span className="stat-value">{snapshot.eventsCount}</span>
          <p>Upcoming events</p>
        </div>
        <div className="stat-card">
          <span className="stat-value">{snapshot.candidatesCount}</span>
          <p>Candidates</p>
        </div>
        <div className="stat-card">
          <span className="stat-value">{snapshot.organizationsCount}</span>
          <p>Organizations</p>
        </div>
        <div className="stat-card">
          <span className="stat-value">{snapshot.pendingCount}</span>
          <p>Pending submissions</p>
        </div>
      </div>

      <div className="dashboard-tabs" role="tablist" aria-label="Dashboard content tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`dashboard-tab${activeTab === tab.id ? " is-active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "events" ? <DashboardEventManager /> : null}
      {activeTab === "candidates" ? <DashboardCandidateManager /> : null}
      {activeTab === "organizations" ? <DashboardOrganizationManager /> : null}
      {activeTab === "news" ? <DashboardNewsManager /> : null}
      {activeTab === "members" ? <DashboardMemberManager /> : null}
    </section>
  );
}
