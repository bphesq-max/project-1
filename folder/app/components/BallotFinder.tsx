"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

import { CALIFORNIA_COUNTIES } from "./memberData";

type BallotAddressForm = {
  street1: string;
  street2: string;
  city: string;
  zipCode: string;
  county: string;
};

type BallotContestView = {
  id: string;
  ballotTitle: string;
  contestType: "candidate" | "measure";
  officeName?: string;
  districtName?: string;
  matchedCandidates: Array<{
    id: string;
    title: string;
    href: string;
  }>;
  officialCandidateNames?: string[];
};

type BallotPreview = {
  election: {
    id: string;
    name: string;
    electionDate?: string;
  };
  address: {
    normalizedAddress: string;
    county: string;
    region?: string;
  };
  contests: BallotContestView[];
  pollingLocations: Array<{
    name: string;
    address?: string;
    notes?: string;
  }>;
  earlyVotingSites: Array<{
    name: string;
    address?: string;
    notes?: string;
  }>;
  dropBoxes: Array<{
    name: string;
    address?: string;
    notes?: string;
  }>;
  lookupMode: "official" | "internal";
  coverageNote: string;
};

type SavedBallotResponse = {
  election?: {
    id: string;
    name: string;
    electionDate?: string;
  };
  address?: {
    street1?: string;
    street2?: string;
    city?: string;
    zipCode?: string;
    normalizedAddress: string;
    county: string;
    region?: string;
  };
  ballot?: {
    generatedAt: string;
    coverageNote?: string;
    pollingLocations?: Array<{
      name: string;
      address?: string;
      notes?: string;
    }>;
    earlyVotingSites?: Array<{
      name: string;
      address?: string;
      notes?: string;
    }>;
    dropBoxes?: Array<{
      name: string;
      address?: string;
      notes?: string;
    }>;
  };
  contests?: BallotContestView[];
  suggestedAddress?: {
    street1?: string;
    city?: string;
    zipCode?: string;
    county?: string;
  };
};

const emptyForm: BallotAddressForm = {
  street1: "",
  street2: "",
  city: "",
  zipCode: "",
  county: "",
};

export default function BallotFinder() {
  const [form, setForm] = useState<BallotAddressForm>(emptyForm);
  const [savedBallot, setSavedBallot] = useState<SavedBallotResponse | null>(null);
  const [preview, setPreview] = useState<BallotPreview | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadBallot() {
      try {
        const response = await fetch("/api/ballot", { cache: "no-store" });
        const data = (await response.json()) as SavedBallotResponse & { error?: string };

        if (!response.ok) {
          throw new Error(data.error || "Unable to load your ballot profile.");
        }

        if (!isMounted) {
          return;
        }

        setSavedBallot(data);
        setForm({
          street1: data.address?.street1 || data.suggestedAddress?.street1 || "",
          street2: data.address?.street2 || "",
          city: data.address?.city || data.suggestedAddress?.city || "",
          zipCode: data.address?.zipCode || data.suggestedAddress?.zipCode || "",
          county: data.address?.county || data.suggestedAddress?.county || "",
        });
      } catch (error) {
        if (isMounted) {
          setMessage(error instanceof Error ? error.message : "Unable to load your ballot profile.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadBallot();

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleLookup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");
    setPreview(null);

    try {
      const response = await fetch("/api/ballot/lookup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });
      const data = (await response.json()) as BallotPreview & { error?: string };

      if (!response.ok) {
        throw new Error(data.error || "Unable to generate your ballot preview.");
      }

      setPreview(data);
      setMessage(
        "Ballot preview ready. Review the statewide and ZIP-matched contests, then save it to your account if you want to keep it."
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to generate your ballot preview."
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSave() {
    setSubmitting(true);
    setMessage("");

    try {
      const response = await fetch("/api/ballot/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });
      const data = (await response.json()) as SavedBallotResponse & { error?: string };

      if (!response.ok) {
        throw new Error(data.error || "Unable to save your ballot.");
      }

      setSavedBallot(data);
      setPreview(null);
      setMessage("Your optional California ballot profile is saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save your ballot.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="section page-stack">
      <div className="section-header">
        <span className="section-kicker">Members only</span>
        <h1 className="heading">Find My Ballot</h1>
        <p className="section-intro">
          This optional California-only tool lets members save a registered-voter
          address and keep a private ballot profile on file. Your address is not
          public and will only be used for ballot and district matching.
        </p>
      </div>

      <div className="dashboard-panel page-stack">
        <div>
          <h2 className="panel-title">How this works</h2>
          <p className="section-intro">
            Save your registered address once if you want a personal ballot view.
            Nothing here is required for membership, and no emails go out unless
            you explicitly opt in elsewhere.
          </p>
        </div>
        {message ? <p className="form-message">{message}</p> : null}
        {loading ? <p className="section-intro">Loading ballot profile...</p> : null}
        <form className="dashboard-form ballot-form" onSubmit={handleLookup}>
          <label className="form-field">
            <span>Street address</span>
            <input
              value={form.street1}
              onChange={(event) => setForm((current) => ({ ...current, street1: event.target.value }))}
              placeholder="1031 Kentfield Drive"
              required
            />
          </label>
          <label className="form-field">
            <span>Apt / suite</span>
            <input
              value={form.street2}
              onChange={(event) => setForm((current) => ({ ...current, street2: event.target.value }))}
              placeholder="Optional"
            />
          </label>
          <div className="ballot-form-grid">
            <label className="form-field">
              <span>City</span>
              <input
                value={form.city}
                onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))}
                placeholder="Salinas"
                required
              />
            </label>
            <label className="form-field">
              <span>ZIP code</span>
              <input
                value={form.zipCode}
                onChange={(event) => setForm((current) => ({ ...current, zipCode: event.target.value }))}
                placeholder="93901"
                inputMode="numeric"
                required
              />
            </label>
          </div>
          <label className="form-field">
            <span>County</span>
            <select
              value={form.county}
              onChange={(event) => setForm((current) => ({ ...current, county: event.target.value }))}
              required
            >
              <option value="">Select your California county</option>
              {CALIFORNIA_COUNTIES.map((county) => (
                <option key={county} value={county}>
                  {county}
                </option>
              ))}
            </select>
          </label>
          <div className="dashboard-inline-actions">
            <button type="submit" className="button button-primary" disabled={submitting}>
              {submitting ? "Generating..." : "Generate ballot preview"}
            </button>
            <Link href="/members" className="dashboard-inline-button">
              Back to member account
            </Link>
          </div>
        </form>
      </div>

      {preview ? (
        <div className="dashboard-panel page-stack">
          <div className="dashboard-item-top">
            <div className="dashboard-item-tags">
              <span className="card-tag">Preview</span>
              <span className="dashboard-badge">{preview.address.county} County</span>
              {preview.address.region ? (
                <span className="dashboard-badge">{preview.address.region}</span>
              ) : null}
            </div>
          </div>
          <div>
            <h2 className="panel-title">{preview.election.name}</h2>
            <p className="section-intro">{preview.address.normalizedAddress}</p>
            <p className="section-intro">
              {preview.lookupMode === "official"
                ? "Official California election data is connected for this preview."
                : "Official live ballot data is not connected yet, so this preview is using your current site coverage and ZIP-matched district tags."}
            </p>
            <p className="section-intro">{preview.coverageNote}</p>
          </div>
          {preview.pollingLocations.length || preview.earlyVotingSites.length || preview.dropBoxes.length ? (
            <div className="dashboard-grid">
              {preview.pollingLocations.length ? (
                <div className="dashboard-panel">
                  <h3 className="panel-title">Polling places</h3>
                  <div className="stack-list">
                    {preview.pollingLocations.map((location) => (
                      <div key={`${location.name}-${location.address}`} className="dashboard-item">
                        <h3>{location.name}</h3>
                        {location.address ? <p>{location.address}</p> : null}
                        {location.notes ? <p className="dashboard-meta">{location.notes}</p> : null}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
              {preview.earlyVotingSites.length ? (
                <div className="dashboard-panel">
                  <h3 className="panel-title">Early voting</h3>
                  <div className="stack-list">
                    {preview.earlyVotingSites.map((location) => (
                      <div key={`${location.name}-${location.address}`} className="dashboard-item">
                        <h3>{location.name}</h3>
                        {location.address ? <p>{location.address}</p> : null}
                        {location.notes ? <p className="dashboard-meta">{location.notes}</p> : null}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
              {preview.dropBoxes.length ? (
                <div className="dashboard-panel">
                  <h3 className="panel-title">Drop boxes</h3>
                  <div className="stack-list">
                    {preview.dropBoxes.map((location) => (
                      <div key={`${location.name}-${location.address}`} className="dashboard-item">
                        <h3>{location.name}</h3>
                        {location.address ? <p>{location.address}</p> : null}
                        {location.notes ? <p className="dashboard-meta">{location.notes}</p> : null}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
          <div className="stack-list">
            {preview.contests.length ? (
              preview.contests.map((contest) => (
                <div key={contest.id} className="dashboard-item">
                  <h3>{contest.ballotTitle}</h3>
                  {contest.officeName ? <p>{contest.officeName}</p> : null}
                  {contest.officialCandidateNames?.length ? (
                    <p className="dashboard-meta">
                      Official listing: {contest.officialCandidateNames.join(", ")}
                    </p>
                  ) : null}
                  {contest.matchedCandidates.length ? (
                    <div className="stack-list">
                      {contest.matchedCandidates.map((candidate) => (
                        <Link
                          key={candidate.id}
                          href={candidate.href}
                          className="dashboard-inline-button"
                          target="_blank"
                          rel="noreferrer"
                        >
                          {candidate.title}
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <p className="section-intro">
                      {contest.contestType === "measure"
                        ? "This ballot measure is recorded here, but your site does not have a linked measure page yet."
                        : "No candidate page is matched to this contest yet."}
                    </p>
                  )}
                </div>
              ))
            ) : (
              <p className="section-intro">
                No contests are mapped yet for this address. Save it anyway if you want
                county and region ballot analytics included now.
              </p>
            )}
          </div>
          <div className="dashboard-inline-actions">
            <button type="button" className="button button-primary" onClick={handleSave} disabled={submitting}>
              {submitting ? "Saving..." : "Save my ballot"}
            </button>
          </div>
        </div>
      ) : null}

      {savedBallot?.ballot && savedBallot.address ? (
        <div className="dashboard-panel page-stack">
          <div className="dashboard-item-top">
            <div className="dashboard-item-tags">
              <span className="card-tag">Saved ballot</span>
              <span className="dashboard-badge">{savedBallot.address.county} County</span>
              {savedBallot.address.region ? (
                <span className="dashboard-badge">{savedBallot.address.region}</span>
              ) : null}
            </div>
          </div>
          <div>
            <h2 className="panel-title">{savedBallot.election?.name || "Saved California ballot"}</h2>
            <p className="section-intro">{savedBallot.address.normalizedAddress}</p>
            <p className="section-intro">
              Saved {new Date(savedBallot.ballot.generatedAt).toLocaleDateString("en-US")}.
            </p>
            {savedBallot.ballot.coverageNote ? (
              <p className="section-intro">{savedBallot.ballot.coverageNote}</p>
            ) : null}
          </div>
          {savedBallot.ballot.pollingLocations?.length ||
          savedBallot.ballot.earlyVotingSites?.length ||
          savedBallot.ballot.dropBoxes?.length ? (
            <div className="dashboard-grid">
              {savedBallot.ballot.pollingLocations?.length ? (
                <div className="dashboard-panel">
                  <h3 className="panel-title">Saved polling places</h3>
                  <div className="stack-list">
                    {savedBallot.ballot.pollingLocations.map((location) => (
                      <div key={`${location.name}-${location.address}`} className="dashboard-item">
                        <h3>{location.name}</h3>
                        {location.address ? <p>{location.address}</p> : null}
                        {location.notes ? <p className="dashboard-meta">{location.notes}</p> : null}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
              {savedBallot.ballot.earlyVotingSites?.length ? (
                <div className="dashboard-panel">
                  <h3 className="panel-title">Saved early voting sites</h3>
                  <div className="stack-list">
                    {savedBallot.ballot.earlyVotingSites.map((location) => (
                      <div key={`${location.name}-${location.address}`} className="dashboard-item">
                        <h3>{location.name}</h3>
                        {location.address ? <p>{location.address}</p> : null}
                        {location.notes ? <p className="dashboard-meta">{location.notes}</p> : null}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
              {savedBallot.ballot.dropBoxes?.length ? (
                <div className="dashboard-panel">
                  <h3 className="panel-title">Saved drop boxes</h3>
                  <div className="stack-list">
                    {savedBallot.ballot.dropBoxes.map((location) => (
                      <div key={`${location.name}-${location.address}`} className="dashboard-item">
                        <h3>{location.name}</h3>
                        {location.address ? <p>{location.address}</p> : null}
                        {location.notes ? <p className="dashboard-meta">{location.notes}</p> : null}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
          <div className="stack-list">
            {(savedBallot.contests ?? []).map((contest) => (
              <div key={contest.id} className="dashboard-item">
                <h3>{contest.ballotTitle}</h3>
                {contest.officeName ? <p>{contest.officeName}</p> : null}
                {contest.officialCandidateNames?.length ? (
                  <p className="dashboard-meta">
                    Official listing: {contest.officialCandidateNames.join(", ")}
                  </p>
                ) : null}
                {contest.matchedCandidates.length ? (
                  <div className="stack-list">
                    {contest.matchedCandidates.map((candidate) => (
                      <Link
                        key={candidate.id}
                        href={candidate.href}
                        className="dashboard-inline-button"
                        target="_blank"
                        rel="noreferrer"
                      >
                        {candidate.title}
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="section-intro">
                    {contest.contestType === "measure"
                      ? "This measure is stored on the ballot, but your site does not have a linked measure page yet."
                      : "Admin matching is still needed for this contest."}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
