"use client";

import { useEffect, useState } from "react";

type AdminMember = {
  id: string;
  email: string;
  fullName: string;
  role: "member" | "admin";
  providers: string[];
  createdAt: string;
  updatedAt: string;
  county?: string;
  region?: string;
};

export default function DashboardMemberManager() {
  const [members, setMembers] = useState<AdminMember[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadMembers() {
      try {
        const response = await fetch("/api/admin/members");
        const data = (await response.json()) as {
          members?: AdminMember[];
          error?: string;
        };

        if (!response.ok) {
          throw new Error(data.error || "Unable to load members.");
        }

        if (isMounted) {
          setMembers(data.members ?? []);
        }
      } catch (nextError) {
        if (isMounted) {
          setError(nextError instanceof Error ? nextError.message : "Unable to load members.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadMembers();

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleRoleChange(email: string, role: "member" | "admin") {
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/admin/members", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, role }),
      });
      const data = (await response.json()) as {
        member?: AdminMember;
        error?: string;
      };

      if (!response.ok || !data.member) {
        throw new Error(data.error || "Unable to update role.");
      }

      setMembers((current) =>
        current.map((member) => (member.email === email ? data.member! : member))
      );
      setMessage(`${data.member.fullName} is now ${data.member.role}.`);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Unable to update role.");
    }
  }

  return (
    <div className="dashboard-grid">
      <div className="dashboard-panel">
        <h2 className="panel-title">Member access</h2>
        <p className="section-intro">
          Promote members to admin access so they can enter the dashboard.
        </p>
        {message ? <p className="form-message">{message}</p> : null}
        {error ? <p className="form-message">{error}</p> : null}
        {loading ? (
          <p className="section-intro">Loading members...</p>
        ) : (
          <div className="stack-list">
            {members.map((member) => (
              <div key={member.id} className="dashboard-item">
                <div className="dashboard-item-top">
                  <div className="dashboard-item-tags">
                    <span className="card-tag">{member.role === "admin" ? "Admin" : "Member"}</span>
                    <span className="dashboard-badge">
                      {member.providers.join(", ")}
                    </span>
                    {member.region ? <span className="dashboard-badge">{member.region}</span> : null}
                  </div>
                </div>
                <h3>{member.fullName}</h3>
                <p>{member.email}</p>
                <p className="dashboard-meta">
                  {member.county ? `${member.county} county` : "No county saved"} · Updated{" "}
                  {new Date(member.updatedAt).toLocaleDateString("en-US")}
                </p>
                <div className="dashboard-inline-actions">
                  <button
                    type="button"
                    className="dashboard-inline-button"
                    onClick={() => handleRoleChange(member.email, "admin")}
                    disabled={member.role === "admin"}
                  >
                    Make admin
                  </button>
                  <button
                    type="button"
                    className="dashboard-inline-button"
                    onClick={() => handleRoleChange(member.email, "member")}
                    disabled={member.role === "member"}
                  >
                    Remove admin
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
