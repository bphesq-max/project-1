"use client";

import { FormEvent, useState } from "react";
import { REGION_OPTIONS } from "../../components/memberData";
import SubmissionPortalShell from "../../components/SubmissionPortalShell";
import SubmissionSubmitterFields from "../../components/SubmissionSubmitterFields";
import {
  OrganizationSubmission,
  persistOrganizationSubmissions,
  readStoredOrganizationSubmissions,
} from "../../components/submissionData";

const initialForm = {
  submitterName: "",
  submitterEmail: "",
  title: "",
  summary: "",
  body: "",
  region: "Statewide",
  sourceUrl: "",
  xUrl: "",
  facebookUrl: "",
  instagramUrl: "",
};

export default function SubmitOrganizationPage() {
  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const submissions = readStoredOrganizationSubmissions();
    const nextSubmission: OrganizationSubmission = {
      submissionId: `organization-submission-${Date.now()}`,
      submittedAt: new Date().toISOString(),
      submitterName: form.submitterName.trim(),
      submitterEmail: form.submitterEmail.trim(),
      id: `organization-${Date.now()}`,
      title: form.title.trim(),
      summary: form.summary.trim() || undefined,
      body: form.body.trim() || undefined,
      region: form.region,
      sourceUrl: form.sourceUrl.trim() || undefined,
      xUrl: form.xUrl.trim() || undefined,
      facebookUrl: form.facebookUrl.trim() || undefined,
      instagramUrl: form.instagramUrl.trim() || undefined,
    };
    persistOrganizationSubmissions([...submissions, nextSubmission]);
    setForm(initialForm);
    setMessage("Organization submission received. It will stay on hold until an admin reviews it.");
  };

  return (
    <SubmissionPortalShell
      kicker="Organization portal"
      title="Submit your conservative organization"
      intro="Send your group profile for admin review and publication."
    >
        <form className="member-form" onSubmit={handleSubmit}>
          <SubmissionSubmitterFields
            prefix="org"
            nameValue={form.submitterName}
            emailValue={form.submitterEmail}
            onNameChange={(value) => setForm((current) => ({ ...current, submitterName: value }))}
            onEmailChange={(value) => setForm((current) => ({ ...current, submitterEmail: value }))}
          />
          <div className="form-group">
            <label htmlFor="org-submit-title">Organization name</label>
            <input id="org-submit-title" value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} required />
          </div>
          <div className="form-group">
            <label htmlFor="org-submit-summary">Summary</label>
            <textarea id="org-submit-summary" rows={4} value={form.summary} onChange={(event) => setForm((current) => ({ ...current, summary: event.target.value }))} />
          </div>
          <div className="form-group">
            <label htmlFor="org-submit-body">Organization details</label>
            <textarea id="org-submit-body" rows={7} value={form.body} onChange={(event) => setForm((current) => ({ ...current, body: event.target.value }))} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="org-submit-region">Region</label>
              <select id="org-submit-region" value={form.region} onChange={(event) => setForm((current) => ({ ...current, region: event.target.value }))}>
                {REGION_OPTIONS.map((region) => (
                  <option key={region} value={region}>{region}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="org-submit-source">Website URL</label>
              <input id="org-submit-source" type="url" value={form.sourceUrl} onChange={(event) => setForm((current) => ({ ...current, sourceUrl: event.target.value }))} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="org-submit-x">X URL</label>
              <input id="org-submit-x" type="url" value={form.xUrl} onChange={(event) => setForm((current) => ({ ...current, xUrl: event.target.value }))} />
            </div>
            <div className="form-group">
              <label htmlFor="org-submit-facebook">Facebook URL</label>
              <input id="org-submit-facebook" type="url" value={form.facebookUrl} onChange={(event) => setForm((current) => ({ ...current, facebookUrl: event.target.value }))} />
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="org-submit-instagram">Instagram URL</label>
            <input id="org-submit-instagram" type="url" value={form.instagramUrl} onChange={(event) => setForm((current) => ({ ...current, instagramUrl: event.target.value }))} />
          </div>
          <button type="submit" className="button">Submit organization</button>
          {message ? <p className="form-message">{message}</p> : null}
        </form>
    </SubmissionPortalShell>
  );
}
