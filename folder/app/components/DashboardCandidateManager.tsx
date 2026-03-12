"use client";
/* eslint-disable @next/next/no-img-element */

import { ChangeEvent, FormEvent, useState, useSyncExternalStore } from "react";
import {
  CandidateEntry,
  defaultCandidates,
  persistCandidates,
  readStoredCandidates,
  subscribeToStoredCandidates,
} from "./candidateData";
import { fetchLinkPreview } from "./linkPreview";
import {
  CandidateSubmission,
  persistCandidateSubmissions,
  readStoredCandidateSubmissions,
  subscribeToCandidateSubmissions,
} from "./submissionData";

const initialForm = {
  title: "",
  category: "Statewide Candidates" as CandidateEntry["category"],
  summary: "",
  body: "",
  isFeatured: false,
  imageDataUrl: "",
  sourceUrl: "",
  xUrl: "",
  facebookUrl: "",
  instagramUrl: "",
};

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export default function DashboardCandidateManager() {
  const candidates = useSyncExternalStore(
    subscribeToStoredCandidates,
    readStoredCandidates,
    () => defaultCandidates
  );
  const submissions = useSyncExternalStore(
    subscribeToCandidateSubmissions,
    readStoredCandidateSubmissions,
    () => []
  );
  const [form, setForm] = useState(initialForm);
  const [editingCandidateId, setEditingCandidateId] = useState<string | null>(null);
  const [editingSubmissionId, setEditingSubmissionId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [isImporting, setIsImporting] = useState(false);

  const handleImageChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setForm((current) => ({ ...current, imageDataUrl: "" }));
      return;
    }
    const imageDataUrl = await readFileAsDataUrl(file);
    setForm((current) => ({ ...current, imageDataUrl }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const editingCandidate = editingCandidateId
      ? candidates.find((candidate) => candidate.id === editingCandidateId)
      : null;
    const editingSubmission = editingSubmissionId
      ? submissions.find((submission) => submission.submissionId === editingSubmissionId)
      : null;

    const nextCandidate: CandidateEntry = {
      id: editingCandidateId ?? `${form.category}-${form.title}-${Date.now()}`,
      title: form.title.trim(),
      category: form.category,
      summary: form.summary.trim() || undefined,
      body: form.body.trim() || undefined,
      isFeatured: form.isFeatured,
      imageDataUrl: form.imageDataUrl || undefined,
      sourceUrl: form.sourceUrl.trim() || undefined,
      xUrl: form.xUrl.trim() || undefined,
      facebookUrl: form.facebookUrl.trim() || undefined,
      instagramUrl: form.instagramUrl.trim() || undefined,
      districtLabels: editingCandidate?.districtLabels ?? editingSubmission?.districtLabels,
      zipCodes: editingCandidate?.zipCodes ?? editingSubmission?.zipCodes,
    };

    const nextCandidates = editingCandidateId
      ? candidates.map((candidate) =>
          candidate.id === editingCandidateId ? nextCandidate : candidate
        )
      : [...candidates, nextCandidate];

    persistCandidates(nextCandidates);
    if (editingSubmissionId) {
      persistCandidateSubmissions(
        submissions.filter((submission) => submission.submissionId !== editingSubmissionId)
      );
    }
    setForm(initialForm);
    setEditingCandidateId(null);
    setEditingSubmissionId(null);
    setMessage(
      editingCandidateId
        ? `Updated "${nextCandidate.title}".`
        : `Saved "${nextCandidate.title}".`
    );
  };

  const startEditing = (candidate: CandidateEntry) => {
    setEditingCandidateId(candidate.id);
    setEditingSubmissionId(null);
    setForm({
      title: candidate.title,
      category: candidate.category,
      summary: candidate.summary ?? "",
      body: candidate.body ?? "",
      isFeatured: Boolean(candidate.isFeatured),
      imageDataUrl: candidate.imageDataUrl ?? "",
      sourceUrl: candidate.sourceUrl ?? "",
      xUrl: candidate.xUrl ?? "",
      facebookUrl: candidate.facebookUrl ?? "",
      instagramUrl: candidate.instagramUrl ?? "",
    });
    setMessage(`Editing "${candidate.title}".`);
  };

  const cancelEditing = () => {
    setEditingCandidateId(null);
    setEditingSubmissionId(null);
    setForm(initialForm);
    setMessage("Edit cancelled.");
  };

  const startEditingSubmission = (submission: CandidateSubmission) => {
    setEditingCandidateId(null);
    setEditingSubmissionId(submission.submissionId);
    setForm({
      title: submission.title,
      category: submission.category,
      summary: submission.summary ?? "",
      body: submission.body ?? "",
      isFeatured: Boolean(submission.isFeatured),
      imageDataUrl: submission.imageDataUrl ?? "",
      sourceUrl: submission.sourceUrl ?? "",
      xUrl: submission.xUrl ?? "",
      facebookUrl: submission.facebookUrl ?? "",
      instagramUrl: submission.instagramUrl ?? "",
    });
    setMessage(`Reviewing submission from ${submission.submitterName}.`);
  };

  const publishSubmission = (submission: CandidateSubmission) => {
    const nextCandidate: CandidateEntry = {
      id: submission.id,
      title: submission.title,
      category: submission.category,
      summary: submission.summary,
      body: submission.body,
      isFeatured: submission.isFeatured,
      imageDataUrl: submission.imageDataUrl,
      sourceUrl: submission.sourceUrl,
      xUrl: submission.xUrl,
      facebookUrl: submission.facebookUrl,
      instagramUrl: submission.instagramUrl,
      districtLabels: submission.districtLabels,
      zipCodes: submission.zipCodes,
    };
    persistCandidates([...candidates.filter((candidate) => candidate.id !== submission.id), nextCandidate]);
    persistCandidateSubmissions(
      submissions.filter((entry) => entry.submissionId !== submission.submissionId)
    );
    setMessage(`Published "${submission.title}".`);
  };

  const deleteSubmission = (submissionId: string) => {
    persistCandidateSubmissions(
      submissions.filter((submission) => submission.submissionId !== submissionId)
    );
    if (editingSubmissionId === submissionId) {
      cancelEditing();
      return;
    }
    setMessage("Candidate submission deleted.");
  };

  const importFromLink = async () => {
    if (!form.sourceUrl.trim()) {
      setMessage("Add a website URL first.");
      return;
    }

    setIsImporting(true);
    try {
      const preview = await fetchLinkPreview(form.sourceUrl.trim());
      setForm((current) => ({
        ...current,
        title: preview.title || current.title,
        summary: preview.description || current.summary,
        body: current.body || preview.description,
        imageDataUrl: preview.image || current.imageDataUrl,
        sourceUrl: preview.url || current.sourceUrl,
      }));
      setMessage("Imported website preview.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to import preview.");
    } finally {
      setIsImporting(false);
    }
  };

  const deleteCandidate = (id: string) => {
    persistCandidates(candidates.filter((candidate) => candidate.id !== id));
    if (editingCandidateId === id) {
      setEditingCandidateId(null);
      setForm(initialForm);
    }
    setMessage("Candidate removed.");
  };

  return (
    <div className="page-stack">
      <div className="dashboard-panel">
        <div className="panel-header">
          <h2 className="panel-title">Pending candidate submissions</h2>
          <span className="dashboard-badge">{submissions.length} pending</span>
        </div>
        <div className="stack-list">
          {submissions.length ? submissions.map((submission) => (
            <article key={submission.submissionId} className="dashboard-item">
              <div className="dashboard-item-top">
                <div className="dashboard-item-tags">
                  <span className="card-tag">On hold</span>
                  <span className="dashboard-badge">{submission.category}</span>
                </div>
                <div className="dashboard-item-actions">
                  <button type="button" className="dashboard-inline-button" onClick={() => publishSubmission(submission)}>Publish</button>
                  <button type="button" className="dashboard-inline-button" onClick={() => startEditingSubmission(submission)}>Edit &amp; Publish</button>
                  <button type="button" className="dashboard-remove" onClick={() => deleteSubmission(submission.submissionId)}>Delete</button>
                </div>
              </div>
              <h3>{submission.title}</h3>
              <p>Submitted by {submission.submitterName} ({submission.submitterEmail})</p>
              {submission.summary ? <p>{submission.summary}</p> : null}
            </article>
          )) : <p className="calendar-empty-copy">No pending candidate submissions.</p>}
        </div>
      </div>

    <div className="dashboard-grid">
      <div className="dashboard-panel">
        <div className="panel-header">
          <h2 className="panel-title">
            {editingCandidateId || editingSubmissionId ? "Edit candidate" : "Add a candidate"}
          </h2>
          {editingCandidateId ? (
            <button type="button" className="dashboard-inline-button" onClick={cancelEditing}>
              Cancel edit
            </button>
          ) : null}
        </div>

        <form className="member-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="candidate-title">Candidate title</label>
            <input
              id="candidate-title"
              name="candidate-title"
              type="text"
              value={form.title}
              onChange={(event) =>
                setForm((current) => ({ ...current, title: event.target.value }))
              }
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="candidate-source-url">Website URL</label>
            <input
              id="candidate-source-url"
              name="candidate-source-url"
              type="url"
              value={form.sourceUrl}
              onChange={(event) =>
                setForm((current) => ({ ...current, sourceUrl: event.target.value }))
              }
              placeholder="https://example.com"
            />
          </div>

          <div className="dashboard-form-actions">
            <button
              type="button"
              className="button button-secondary dashboard-button-secondary"
              onClick={importFromLink}
              disabled={isImporting}
            >
              {isImporting ? "Importing..." : "Import Preview"}
            </button>
          </div>

          <div className="form-group">
            <label htmlFor="candidate-category">Section</label>
            <select
              id="candidate-category"
              name="candidate-category"
              value={form.category}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  category: event.target.value as CandidateEntry["category"],
                }))
              }
            >
              <option>Statewide Candidates</option>
              <option>Congressional Candidates</option>
              <option>State Assembly Candidates</option>
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="candidate-x-url">X profile URL</label>
              <input
                id="candidate-x-url"
                name="candidate-x-url"
                type="url"
                value={form.xUrl}
                onChange={(event) =>
                  setForm((current) => ({ ...current, xUrl: event.target.value }))
                }
                placeholder="https://x.com/handle"
              />
            </div>

            <div className="form-group">
              <label htmlFor="candidate-facebook-url">Facebook URL</label>
              <input
                id="candidate-facebook-url"
                name="candidate-facebook-url"
                type="url"
                value={form.facebookUrl}
                onChange={(event) =>
                  setForm((current) => ({ ...current, facebookUrl: event.target.value }))
                }
                placeholder="https://facebook.com/page"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="candidate-instagram-url">Instagram URL</label>
            <input
              id="candidate-instagram-url"
              name="candidate-instagram-url"
              type="url"
              value={form.instagramUrl}
              onChange={(event) =>
                setForm((current) => ({ ...current, instagramUrl: event.target.value }))
              }
              placeholder="https://instagram.com/handle"
            />
          </div>

          <div className="form-group">
            <label htmlFor="candidate-summary">Optional summary</label>
            <textarea
              id="candidate-summary"
              name="candidate-summary"
              rows={4}
              value={form.summary}
              onChange={(event) =>
                setForm((current) => ({ ...current, summary: event.target.value }))
              }
            ></textarea>
          </div>

          <div className="form-group">
            <label htmlFor="candidate-body">Candidate page details</label>
            <textarea
              id="candidate-body"
              name="candidate-body"
              rows={6}
              value={form.body}
              onChange={(event) =>
                setForm((current) => ({ ...current, body: event.target.value }))
              }
            ></textarea>
          </div>

          <label className="consent-row dashboard-checkbox-row">
            <input
              type="checkbox"
              checked={form.isFeatured}
              onChange={(event) =>
                setForm((current) => ({ ...current, isFeatured: event.target.checked }))
              }
            />
            <span>
              Mark as <strong>Featured candidate</strong> for homepage placement.
            </span>
          </label>

          <div className="form-group">
            <label htmlFor="candidate-image">Candidate image</label>
            <input
              id="candidate-image"
              name="candidate-image"
              type="file"
              accept="image/*"
              onChange={handleImageChange}
            />
          </div>

          {form.imageDataUrl ? (
            <div className="event-image-preview">
              <img
                src={form.imageDataUrl}
                alt="Candidate preview"
                className="event-image-preview-media"
              />
            </div>
          ) : null}

          <div className="dashboard-form-actions">
            <button type="submit" className="button">
              {editingCandidateId || editingSubmissionId ? "Update Candidate" : "Save Candidate"}
            </button>
            {editingCandidateId || editingSubmissionId ? (
              <button
                type="button"
                className="button button-secondary dashboard-button-secondary"
                onClick={cancelEditing}
              >
                Cancel
              </button>
            ) : null}
          </div>
          {message ? <p className="form-message">{message}</p> : null}
        </form>
      </div>

      <div className="dashboard-panel">
        <div className="panel-header">
          <h2 className="panel-title">Candidate list</h2>
          <span className="dashboard-badge">{candidates.length} candidates</span>
        </div>
        <div className="stack-list">
          {candidates.map((candidate) => (
            <article key={candidate.id} className="dashboard-item">
              <div className="dashboard-item-top">
                <div className="dashboard-item-tags">
                  <span className="card-tag">{candidate.category}</span>
                  {candidate.isFeatured ? <span className="dashboard-badge">Featured</span> : null}
                </div>
                <div className="dashboard-item-actions">
                  <button
                    type="button"
                    className="dashboard-inline-button"
                    onClick={() => startEditing(candidate)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="dashboard-remove"
                    onClick={() => deleteCandidate(candidate.id)}
                  >
                    Remove
                  </button>
                </div>
              </div>
              <h3>{candidate.title}</h3>
              {candidate.summary ? <p>{candidate.summary}</p> : null}
              {candidate.imageDataUrl ? (
                <img
                  src={candidate.imageDataUrl}
                  alt={`${candidate.title} image`}
                  className="dashboard-event-image"
                />
              ) : null}
            </article>
          ))}
        </div>
      </div>
    </div>
    </div>
  );
}
