"use client";

import { FormEvent, useState } from "react";
import { REGION_OPTIONS } from "../../components/memberData";
import SubmissionPortalShell from "../../components/SubmissionPortalShell";
import SubmissionSubmitterFields from "../../components/SubmissionSubmitterFields";
import {
  EventSubmission,
  persistEventSubmissions,
  readStoredEventSubmissions,
} from "../../components/submissionData";

const initialForm = {
  submitterName: "",
  submitterEmail: "",
  title: "",
  date: "",
  time: "",
  location: "",
  region: "Statewide",
  description: "",
  sourceUrl: "",
};

export default function SubmitEventPage() {
  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const submissions = readStoredEventSubmissions();
    const nextSubmission: EventSubmission = {
      submissionId: `event-submission-${Date.now()}`,
      submittedAt: new Date().toISOString(),
      submitterName: form.submitterName.trim(),
      submitterEmail: form.submitterEmail.trim(),
      id: `event-${Date.now()}`,
      title: form.title.trim(),
      date: form.date,
      time: form.time,
      location: form.location.trim(),
      region: form.region,
      description: form.description.trim(),
      sourceUrl: form.sourceUrl.trim() || undefined,
    };
    persistEventSubmissions([...submissions, nextSubmission]);
    setForm(initialForm);
    setMessage("Event submission received. It will remain on hold until an admin reviews it.");
  };

  return (
    <SubmissionPortalShell
      kicker="Event portal"
      title="Submit your event"
      intro="Send your event for review. Admins can publish, edit and publish, or delete it."
    >
        <form className="member-form" onSubmit={handleSubmit}>
          <SubmissionSubmitterFields
            prefix="event"
            nameValue={form.submitterName}
            emailValue={form.submitterEmail}
            onNameChange={(value) => setForm((current) => ({ ...current, submitterName: value }))}
            onEmailChange={(value) => setForm((current) => ({ ...current, submitterEmail: value }))}
          />
          <div className="form-group">
            <label htmlFor="event-submit-title">Event title</label>
            <input id="event-submit-title" value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} required />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="event-submit-date">Date</label>
              <input id="event-submit-date" type="date" value={form.date} onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))} required />
            </div>
            <div className="form-group">
              <label htmlFor="event-submit-time">Time</label>
              <input id="event-submit-time" type="time" value={form.time} onChange={(event) => setForm((current) => ({ ...current, time: event.target.value }))} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="event-submit-location">Location</label>
              <input id="event-submit-location" value={form.location} onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))} required />
            </div>
            <div className="form-group">
              <label htmlFor="event-submit-region">Region</label>
              <select id="event-submit-region" value={form.region} onChange={(event) => setForm((current) => ({ ...current, region: event.target.value }))}>
                {REGION_OPTIONS.map((region) => (
                  <option key={region} value={region}>{region}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="event-submit-description">Description</label>
            <textarea id="event-submit-description" rows={6} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} required />
          </div>
          <div className="form-group">
            <label htmlFor="event-submit-source">Website URL</label>
            <input id="event-submit-source" type="url" value={form.sourceUrl} onChange={(event) => setForm((current) => ({ ...current, sourceUrl: event.target.value }))} />
          </div>
          <button type="submit" className="button">Submit event</button>
          {message ? <p className="form-message">{message}</p> : null}
        </form>
    </SubmissionPortalShell>
  );
}
