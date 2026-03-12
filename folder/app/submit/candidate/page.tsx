"use client";

import { FormEvent, useState } from "react";
import SubmissionPortalShell from "../../components/SubmissionPortalShell";
import SubmissionSubmitterFields from "../../components/SubmissionSubmitterFields";
import {
  CandidateSubmission,
  persistCandidateSubmissions,
  readStoredCandidateSubmissions,
} from "../../components/submissionData";

const initialForm = {
  submitterName: "",
  submitterEmail: "",
  title: "",
  category: "Statewide Candidates",
  summary: "",
  body: "",
  sourceUrl: "",
  xUrl: "",
  facebookUrl: "",
  instagramUrl: "",
};

export default function SubmitCandidatePage() {
  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const submissions = readStoredCandidateSubmissions();
    const nextSubmission: CandidateSubmission = {
      submissionId: `candidate-submission-${Date.now()}`,
      submittedAt: new Date().toISOString(),
      submitterName: form.submitterName.trim(),
      submitterEmail: form.submitterEmail.trim(),
      id: `candidate-${Date.now()}`,
      title: form.title.trim(),
      category: form.category as CandidateSubmission["category"],
      summary: form.summary.trim() || undefined,
      body: form.body.trim() || undefined,
      sourceUrl: form.sourceUrl.trim() || undefined,
      xUrl: form.xUrl.trim() || undefined,
      facebookUrl: form.facebookUrl.trim() || undefined,
      instagramUrl: form.instagramUrl.trim() || undefined,
    };

    persistCandidateSubmissions([...submissions, nextSubmission]);
    setForm(initialForm);
    setMessage("Candidate submission received. It will stay on hold until an admin reviews it.");
  };

  return (
    <SubmissionPortalShell
      kicker="Candidate portal"
      title="Submit your candidate profile"
      intro="Send your campaign information for review. Nothing publishes until an admin approves it."
    >
        <form className="member-form" onSubmit={handleSubmit}>
          <SubmissionSubmitterFields
            prefix="candidate"
            nameValue={form.submitterName}
            emailValue={form.submitterEmail}
            onNameChange={(value) => setForm((current) => ({ ...current, submitterName: value }))}
            onEmailChange={(value) => setForm((current) => ({ ...current, submitterEmail: value }))}
          />
          <div className="form-group">
            <label htmlFor="candidate-submit-title">Candidate title</label>
            <input id="candidate-submit-title" value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} required />
          </div>
          <div className="form-group">
            <label htmlFor="candidate-submit-category">Section</label>
            <select id="candidate-submit-category" value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}>
              <option>Statewide Candidates</option>
              <option>Congressional Candidates</option>
              <option>State Assembly Candidates</option>
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="candidate-submit-summary">Summary</label>
            <textarea id="candidate-submit-summary" rows={4} value={form.summary} onChange={(event) => setForm((current) => ({ ...current, summary: event.target.value }))} />
          </div>
          <div className="form-group">
            <label htmlFor="candidate-submit-body">Candidate details</label>
            <textarea id="candidate-submit-body" rows={7} value={form.body} onChange={(event) => setForm((current) => ({ ...current, body: event.target.value }))} />
          </div>
          <div className="form-group">
            <label htmlFor="candidate-submit-source">Website URL</label>
            <input id="candidate-submit-source" type="url" value={form.sourceUrl} onChange={(event) => setForm((current) => ({ ...current, sourceUrl: event.target.value }))} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="candidate-submit-x">X URL</label>
              <input id="candidate-submit-x" type="url" value={form.xUrl} onChange={(event) => setForm((current) => ({ ...current, xUrl: event.target.value }))} />
            </div>
            <div className="form-group">
              <label htmlFor="candidate-submit-facebook">Facebook URL</label>
              <input id="candidate-submit-facebook" type="url" value={form.facebookUrl} onChange={(event) => setForm((current) => ({ ...current, facebookUrl: event.target.value }))} />
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="candidate-submit-instagram">Instagram URL</label>
            <input id="candidate-submit-instagram" type="url" value={form.instagramUrl} onChange={(event) => setForm((current) => ({ ...current, instagramUrl: event.target.value }))} />
          </div>
          <button type="submit" className="button">Submit candidate</button>
          {message ? <p className="form-message">{message}</p> : null}
        </form>
    </SubmissionPortalShell>
  );
}
