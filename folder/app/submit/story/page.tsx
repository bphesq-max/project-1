"use client";

import { FormEvent, useState } from "react";
import { REGION_OPTIONS } from "../../components/memberData";
import SubmissionPortalShell from "../../components/SubmissionPortalShell";
import SubmissionSubmitterFields from "../../components/SubmissionSubmitterFields";
import {
  StorySubmission,
  persistStorySubmissions,
  readStoredStorySubmissions,
} from "../../components/submissionData";

const initialForm = {
  submitterName: "",
  submitterEmail: "",
  title: "",
  region: "Statewide",
  category: "Campaign",
  storyType: "article" as "article" | "x-post",
  summary: "",
  body: "",
  sourceUrl: "",
};

export default function SubmitStoryPage() {
  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const submissions = readStoredStorySubmissions();
    const nextSubmission: StorySubmission = {
      submissionId: `story-submission-${Date.now()}`,
      submittedAt: new Date().toISOString(),
      submitterName: form.submitterName.trim(),
      submitterEmail: form.submitterEmail.trim(),
      id: `story-${Date.now()}`,
      title: form.title.trim(),
      region: form.region,
      status: "Pending Review",
      category: form.category,
      storyType: form.storyType,
      summary: form.summary.trim(),
      body: form.body.trim(),
      sourceUrl: form.sourceUrl.trim() || undefined,
    };
    persistStorySubmissions([...submissions, nextSubmission]);
    setForm(initialForm);
    setMessage("Story submission received. It will remain on hold until an admin reviews it.");
  };

  return (
    <SubmissionPortalShell
      kicker="Story portal"
      title="Submit your story"
      intro="Share an article or X post. Admins will review it before anything goes live."
    >
        <form className="member-form" onSubmit={handleSubmit}>
          <SubmissionSubmitterFields
            prefix="story"
            nameValue={form.submitterName}
            emailValue={form.submitterEmail}
            onNameChange={(value) => setForm((current) => ({ ...current, submitterName: value }))}
            onEmailChange={(value) => setForm((current) => ({ ...current, submitterEmail: value }))}
          />
          <div className="form-group">
            <label htmlFor="story-submit-title">Headline</label>
            <input id="story-submit-title" value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} required />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="story-submit-region">Region</label>
              <select id="story-submit-region" value={form.region} onChange={(event) => setForm((current) => ({ ...current, region: event.target.value }))}>
                {REGION_OPTIONS.map((region) => (
                  <option key={region} value={region}>{region}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="story-submit-category">Category</label>
              <select id="story-submit-category" value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}>
                <option>Campaign</option><option>Policy</option><option>Events</option><option>Organization</option><option>Opinion</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="story-submit-type">Story type</label>
            <select id="story-submit-type" value={form.storyType} onChange={(event) => setForm((current) => ({ ...current, storyType: event.target.value as "article" | "x-post" }))}>
              <option value="article">Article</option>
              <option value="x-post">X Post</option>
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="story-submit-source">Source URL</label>
            <input id="story-submit-source" type="url" value={form.sourceUrl} onChange={(event) => setForm((current) => ({ ...current, sourceUrl: event.target.value }))} placeholder="Article URL or X post URL" />
          </div>
          <div className="form-group">
            <label htmlFor="story-submit-summary">Summary</label>
            <textarea id="story-submit-summary" rows={4} value={form.summary} onChange={(event) => setForm((current) => ({ ...current, summary: event.target.value }))} />
          </div>
          <div className="form-group">
            <label htmlFor="story-submit-body">{form.storyType === "x-post" ? "Optional editor note" : "Story body"}</label>
            <textarea id="story-submit-body" rows={7} value={form.body} onChange={(event) => setForm((current) => ({ ...current, body: event.target.value }))} />
          </div>
          <button type="submit" className="button">Submit story</button>
          {message ? <p className="form-message">{message}</p> : null}
        </form>
    </SubmissionPortalShell>
  );
}
