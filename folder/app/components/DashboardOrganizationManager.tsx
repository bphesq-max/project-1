"use client";
/* eslint-disable @next/next/no-img-element */

import { ChangeEvent, FormEvent, useState, useSyncExternalStore } from "react";
import {
  defaultOrganizations,
  OrganizationEntry,
  persistOrganizations,
  readStoredOrganizations,
  subscribeToStoredOrganizations,
} from "./organizationData";
import { fetchLinkPreview } from "./linkPreview";
import { REGION_OPTIONS } from "./memberData";
import {
  OrganizationSubmission,
  persistOrganizationSubmissions,
  readStoredOrganizationSubmissions,
  subscribeToOrganizationSubmissions,
} from "./submissionData";

const initialForm = {
  title: "",
  summary: "",
  body: "",
  region: "Statewide",
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

export default function DashboardOrganizationManager() {
  const organizations = useSyncExternalStore(
    subscribeToStoredOrganizations,
    readStoredOrganizations,
    () => defaultOrganizations
  );
  const submissions = useSyncExternalStore(
    subscribeToOrganizationSubmissions,
    readStoredOrganizationSubmissions,
    () => []
  );
  const [form, setForm] = useState(initialForm);
  const [editingOrganizationId, setEditingOrganizationId] = useState<string | null>(null);
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

    const nextOrganization: OrganizationEntry = {
      id: editingOrganizationId ?? `${form.title}-${Date.now()}`,
      title: form.title.trim(),
      summary: form.summary.trim() || undefined,
      body: form.body.trim() || undefined,
      region: form.region.trim() || undefined,
      isFeatured: form.isFeatured,
      imageDataUrl: form.imageDataUrl || undefined,
      sourceUrl: form.sourceUrl.trim() || undefined,
      xUrl: form.xUrl.trim() || undefined,
      facebookUrl: form.facebookUrl.trim() || undefined,
      instagramUrl: form.instagramUrl.trim() || undefined,
    };

    const nextOrganizations = editingOrganizationId
      ? organizations.map((organization) =>
          organization.id === editingOrganizationId ? nextOrganization : organization
        )
      : [...organizations, nextOrganization];

    persistOrganizations(nextOrganizations);
    if (editingSubmissionId) {
      persistOrganizationSubmissions(
        submissions.filter((submission) => submission.submissionId !== editingSubmissionId)
      );
    }
    setForm(initialForm);
    setEditingOrganizationId(null);
    setEditingSubmissionId(null);
    setMessage(
      editingOrganizationId
        ? `Updated "${nextOrganization.title}".`
        : `Saved "${nextOrganization.title}".`
    );
  };

  const startEditing = (organization: OrganizationEntry) => {
    setEditingOrganizationId(organization.id);
    setEditingSubmissionId(null);
    setForm({
      title: organization.title,
      summary: organization.summary ?? "",
      body: organization.body ?? "",
      region: organization.region ?? "Statewide",
      isFeatured: Boolean(organization.isFeatured),
      imageDataUrl: organization.imageDataUrl ?? "",
      sourceUrl: organization.sourceUrl ?? "",
      xUrl: organization.xUrl ?? "",
      facebookUrl: organization.facebookUrl ?? "",
      instagramUrl: organization.instagramUrl ?? "",
    });
    setMessage(`Editing "${organization.title}".`);
  };

  const cancelEditing = () => {
    setEditingOrganizationId(null);
    setEditingSubmissionId(null);
    setForm(initialForm);
    setMessage("Edit cancelled.");
  };

  const startEditingSubmission = (submission: OrganizationSubmission) => {
    setEditingOrganizationId(null);
    setEditingSubmissionId(submission.submissionId);
    setForm({
      title: submission.title,
      summary: submission.summary ?? "",
      body: submission.body ?? "",
      region: submission.region ?? "Statewide",
      isFeatured: Boolean(submission.isFeatured),
      imageDataUrl: submission.imageDataUrl ?? "",
      sourceUrl: submission.sourceUrl ?? "",
      xUrl: submission.xUrl ?? "",
      facebookUrl: submission.facebookUrl ?? "",
      instagramUrl: submission.instagramUrl ?? "",
    });
    setMessage(`Reviewing organization submission from ${submission.submitterName}.`);
  };

  const publishSubmission = (submission: OrganizationSubmission) => {
    const nextOrganization: OrganizationEntry = {
      id: submission.id,
      title: submission.title,
      summary: submission.summary,
      body: submission.body,
      region: submission.region,
      isFeatured: submission.isFeatured,
      imageDataUrl: submission.imageDataUrl,
      sourceUrl: submission.sourceUrl,
      xUrl: submission.xUrl,
      facebookUrl: submission.facebookUrl,
      instagramUrl: submission.instagramUrl,
    };
    persistOrganizations([
      ...organizations.filter((organization) => organization.id !== submission.id),
      nextOrganization,
    ]);
    persistOrganizationSubmissions(
      submissions.filter((entry) => entry.submissionId !== submission.submissionId)
    );
    setMessage(`Published "${submission.title}".`);
  };

  const deleteSubmission = (submissionId: string) => {
    persistOrganizationSubmissions(
      submissions.filter((submission) => submission.submissionId !== submissionId)
    );
    if (editingSubmissionId === submissionId) {
      cancelEditing();
      return;
    }
    setMessage("Organization submission deleted.");
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

  const deleteOrganization = (id: string) => {
    persistOrganizations(organizations.filter((organization) => organization.id !== id));
    if (editingOrganizationId === id) {
      setEditingOrganizationId(null);
      setForm(initialForm);
    }
    setMessage("Organization removed.");
  };

  return (
    <div className="page-stack">
      <div className="dashboard-panel">
        <div className="panel-header">
          <h2 className="panel-title">Pending organization submissions</h2>
          <span className="dashboard-badge">{submissions.length} pending</span>
        </div>
        <div className="stack-list">
          {submissions.length ? submissions.map((submission) => (
            <article key={submission.submissionId} className="dashboard-item">
              <div className="dashboard-item-top">
                <div className="dashboard-item-tags">
                  <span className="card-tag">On hold</span>
                  {submission.region ? <span className="dashboard-badge">{submission.region}</span> : null}
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
          )) : <p className="calendar-empty-copy">No pending organization submissions.</p>}
        </div>
      </div>

    <div className="dashboard-grid">
      <div className="dashboard-panel">
        <div className="panel-header">
          <h2 className="panel-title">
            {editingOrganizationId || editingSubmissionId ? "Edit organization" : "Add an organization"}
          </h2>
          {editingOrganizationId ? (
            <button type="button" className="dashboard-inline-button" onClick={cancelEditing}>
              Cancel edit
            </button>
          ) : null}
        </div>

        <form className="member-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="organization-title">Organization name</label>
            <input
              id="organization-title"
              name="organization-title"
              type="text"
              value={form.title}
              onChange={(event) =>
                setForm((current) => ({ ...current, title: event.target.value }))
              }
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="organization-source-url">Website URL</label>
            <input
              id="organization-source-url"
              name="organization-source-url"
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
            <label htmlFor="organization-summary">Summary</label>
            <textarea
              id="organization-summary"
              name="organization-summary"
              rows={4}
              value={form.summary}
              onChange={(event) =>
                setForm((current) => ({ ...current, summary: event.target.value }))
              }
            ></textarea>
          </div>

          <div className="form-group">
            <label htmlFor="organization-body">Organization page details</label>
            <textarea
              id="organization-body"
              name="organization-body"
              rows={6}
              value={form.body}
              onChange={(event) =>
                setForm((current) => ({ ...current, body: event.target.value }))
              }
            ></textarea>
          </div>

          <div className="form-group">
            <label htmlFor="organization-region">Region</label>
            <select
              id="organization-region"
              name="organization-region"
              value={form.region}
              onChange={(event) =>
                setForm((current) => ({ ...current, region: event.target.value }))
              }
            >
              {REGION_OPTIONS.map((region) => (
                <option key={region} value={region}>{region}</option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="organization-x-url">X profile URL</label>
              <input
                id="organization-x-url"
                name="organization-x-url"
                type="url"
                value={form.xUrl}
                onChange={(event) =>
                  setForm((current) => ({ ...current, xUrl: event.target.value }))
                }
                placeholder="https://x.com/handle"
              />
            </div>

            <div className="form-group">
              <label htmlFor="organization-facebook-url">Facebook URL</label>
              <input
                id="organization-facebook-url"
                name="organization-facebook-url"
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
            <label htmlFor="organization-instagram-url">Instagram URL</label>
            <input
              id="organization-instagram-url"
              name="organization-instagram-url"
              type="url"
              value={form.instagramUrl}
              onChange={(event) =>
                setForm((current) => ({ ...current, instagramUrl: event.target.value }))
              }
              placeholder="https://instagram.com/handle"
            />
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
              Mark as <strong>Featured organization</strong>.
            </span>
          </label>

          <div className="form-group">
            <label htmlFor="organization-image">Organization image</label>
            <input
              id="organization-image"
              name="organization-image"
              type="file"
              accept="image/*"
              onChange={handleImageChange}
            />
          </div>

          {form.imageDataUrl ? (
            <div className="event-image-preview">
              <img
                src={form.imageDataUrl}
                alt="Organization preview"
                className="event-image-preview-media"
              />
            </div>
          ) : null}

          <div className="dashboard-form-actions">
            <button type="submit" className="button">
              {editingOrganizationId || editingSubmissionId ? "Update Organization" : "Save Organization"}
            </button>
            {editingOrganizationId || editingSubmissionId ? (
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
          <h2 className="panel-title">Organization list</h2>
          <span className="dashboard-badge">{organizations.length} organizations</span>
        </div>
        <div className="stack-list">
          {organizations.map((organization) => (
            <article key={organization.id} className="dashboard-item">
              <div className="dashboard-item-top">
                <div className="dashboard-item-tags">
                  {organization.isFeatured ? (
                    <span className="dashboard-badge">Featured</span>
                  ) : null}
                </div>
                <div className="dashboard-item-actions">
                  <button
                    type="button"
                    className="dashboard-inline-button"
                    onClick={() => startEditing(organization)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="dashboard-remove"
                    onClick={() => deleteOrganization(organization.id)}
                  >
                    Remove
                  </button>
                </div>
              </div>
              <h3>{organization.title}</h3>
              {organization.summary ? <p>{organization.summary}</p> : null}
              {organization.imageDataUrl ? (
                <img
                  src={organization.imageDataUrl}
                  alt={`${organization.title} image`}
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
