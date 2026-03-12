"use client";
/* eslint-disable @next/next/no-img-element */

import { ChangeEvent, FormEvent, useState, useSyncExternalStore } from "react";
import {
  defaultEvents,
  formatEventDateTime,
  PortalEvent,
} from "./eventData";
import { fetchLinkPreview } from "./linkPreview";
import { REGION_OPTIONS } from "./memberData";
import {
  deletePortalContent,
  savePortalContentItem,
  usePortalContent,
} from "./portalContentClient";
import {
  EventSubmission,
  persistEventSubmissions,
  readStoredEventSubmissions,
  subscribeToEventSubmissions,
} from "./submissionData";

const initialForm = {
  title: "",
  date: "",
  time: "",
  location: "",
  region: "Statewide",
  description: "",
  isFeatured: false,
  imageDataUrl: "",
  sourceUrl: "",
};

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export default function DashboardEventManager() {
  const { items: events, setItems: setEvents } = usePortalContent("events", defaultEvents);
  const submissions = useSyncExternalStore(
    subscribeToEventSubmissions,
    readStoredEventSubmissions,
    () => []
  );
  const [message, setMessage] = useState("");
  const [form, setForm] = useState(initialForm);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editingSubmissionId, setEditingSubmissionId] = useState<string | null>(null);
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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const editingEvent = editingEventId
      ? events.find((entry) => entry.id === editingEventId)
      : null;
    const editingSubmission = editingSubmissionId
      ? submissions.find((submission) => submission.submissionId === editingSubmissionId)
      : null;

    const nextEvent: PortalEvent = {
      id: editingEventId ?? `${form.date}-${form.title}-${Date.now()}`,
      title: form.title.trim(),
      date: form.date,
      time: form.time,
      location: form.location.trim(),
      region: form.region,
      description: form.description.trim(),
      isFeatured: form.isFeatured,
      imageDataUrl: form.imageDataUrl || undefined,
      sourceUrl: form.sourceUrl.trim() || undefined,
      districtLabels: editingEvent?.districtLabels ?? editingSubmission?.districtLabels,
      zipCodes: editingEvent?.zipCodes ?? editingSubmission?.zipCodes,
    };

    try {
      const savedEvent = await savePortalContentItem("events", nextEvent);
      setEvents(
        editingEventId
          ? events.map((entry) => (entry.id === editingEventId ? savedEvent : entry))
          : [...events, savedEvent]
      );
      if (editingSubmissionId) {
        persistEventSubmissions(
          submissions.filter((submission) => submission.submissionId !== editingSubmissionId)
        );
      }
      setForm(initialForm);
      setEditingEventId(null);
      setEditingSubmissionId(null);
      setMessage(
        editingEventId
          ? `Updated "${savedEvent.title}" on the calendar.`
          : `Saved "${savedEvent.title}" to the calendar.`
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save event.");
    }
  };

  const startEditing = (event: PortalEvent) => {
    setEditingEventId(event.id);
    setEditingSubmissionId(null);
    setForm({
      title: event.title,
      date: event.date,
      time: event.time,
      location: event.location,
      region: event.region,
      description: event.description,
      isFeatured: Boolean(event.isFeatured),
      imageDataUrl: event.imageDataUrl ?? "",
      sourceUrl: event.sourceUrl ?? "",
    });
    setMessage(`Editing "${event.title}".`);
  };

  const cancelEditing = () => {
    setEditingEventId(null);
    setEditingSubmissionId(null);
    setForm(initialForm);
    setMessage("Edit cancelled.");
  };

  const startEditingSubmission = (submission: EventSubmission) => {
    setEditingEventId(null);
    setEditingSubmissionId(submission.submissionId);
    setForm({
      title: submission.title,
      date: submission.date,
      time: submission.time,
      location: submission.location,
      region: submission.region,
      description: submission.description,
      isFeatured: Boolean(submission.isFeatured),
      imageDataUrl: submission.imageDataUrl ?? "",
      sourceUrl: submission.sourceUrl ?? "",
    });
    setMessage(`Reviewing event submission from ${submission.submitterName}.`);
  };

  const publishSubmission = (submission: EventSubmission) => {
    const nextEvent: PortalEvent = {
      id: submission.id,
      title: submission.title,
      date: submission.date,
      time: submission.time,
      location: submission.location,
      region: submission.region,
      description: submission.description,
      isFeatured: submission.isFeatured,
      imageDataUrl: submission.imageDataUrl,
      sourceUrl: submission.sourceUrl,
      districtLabels: submission.districtLabels,
      zipCodes: submission.zipCodes,
    };
    void savePortalContentItem("events", nextEvent)
      .then((savedEvent) => {
        setEvents([...events.filter((event) => event.id !== submission.id), savedEvent]);
        persistEventSubmissions(
          submissions.filter((entry) => entry.submissionId !== submission.submissionId)
        );
        setMessage(`Published "${submission.title}".`);
      })
      .catch((error) => {
        setMessage(error instanceof Error ? error.message : "Unable to publish event.");
      });
  };

  const deleteSubmission = (submissionId: string) => {
    persistEventSubmissions(
      submissions.filter((submission) => submission.submissionId !== submissionId)
    );
    if (editingSubmissionId === submissionId) {
      cancelEditing();
      return;
    }
    setMessage("Event submission deleted.");
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
        description: preview.description || current.description,
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

  const deleteEvent = async (id: string) => {
    try {
      await deletePortalContent("events", id);
      setEvents(events.filter((event) => event.id !== id));
      if (editingEventId === id) {
        setEditingEventId(null);
        setForm(initialForm);
      }
      setMessage("Event removed from the calendar.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to remove event.");
    }
  };

  return (
    <div className="page-stack">
      <div className="dashboard-panel">
        <div className="panel-header">
          <h2 className="panel-title">Pending event submissions</h2>
          <span className="dashboard-badge">{submissions.length} pending</span>
        </div>
        <div className="stack-list">
          {submissions.length ? submissions.map((submission) => (
            <article key={submission.submissionId} className="dashboard-item">
              <div className="dashboard-item-top">
                <div className="dashboard-item-tags">
                  <span className="card-tag">On hold</span>
                  <span className="dashboard-badge">{submission.region}</span>
                </div>
                <div className="dashboard-item-actions">
                  <button type="button" className="dashboard-inline-button" onClick={() => publishSubmission(submission)}>Publish</button>
                  <button type="button" className="dashboard-inline-button" onClick={() => startEditingSubmission(submission)}>Edit &amp; Publish</button>
                  <button type="button" className="dashboard-remove" onClick={() => deleteSubmission(submission.submissionId)}>Delete</button>
                </div>
              </div>
              <h3>{submission.title}</h3>
              <p>Submitted by {submission.submitterName} ({submission.submitterEmail})</p>
              <p>{submission.description}</p>
            </article>
          )) : <p className="calendar-empty-copy">No pending event submissions.</p>}
        </div>
      </div>

    <div className="dashboard-grid">
      <div className="dashboard-panel">
        <div className="panel-header">
          <h2 className="panel-title">
            {editingEventId || editingSubmissionId ? "Edit event" : "Add an event"}
          </h2>
          {editingEventId ? (
            <button
              type="button"
              className="dashboard-inline-button"
              onClick={cancelEditing}
            >
              Cancel edit
            </button>
          ) : null}
        </div>
        <form className="member-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="dashboard-event-title">Event title</label>
            <input
              type="text"
              id="dashboard-event-title"
              name="dashboard-event-title"
              value={form.title}
              onChange={(event) =>
                setForm((current) => ({ ...current, title: event.target.value }))
              }
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="dashboard-event-source-url">Website URL</label>
            <input
              type="url"
              id="dashboard-event-source-url"
              name="dashboard-event-source-url"
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

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="dashboard-event-date">Date</label>
              <input
                type="date"
                id="dashboard-event-date"
                name="dashboard-event-date"
                value={form.date}
                onChange={(event) =>
                  setForm((current) => ({ ...current, date: event.target.value }))
                }
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="dashboard-event-time">Time</label>
              <input
                type="time"
                id="dashboard-event-time"
                name="dashboard-event-time"
                value={form.time}
                onChange={(event) =>
                  setForm((current) => ({ ...current, time: event.target.value }))
                }
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="dashboard-event-location">Location</label>
              <input
                type="text"
                id="dashboard-event-location"
                name="dashboard-event-location"
                value={form.location}
                onChange={(event) =>
                  setForm((current) => ({ ...current, location: event.target.value }))
                }
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="dashboard-event-region">Region</label>
              <select
                id="dashboard-event-region"
                name="dashboard-event-region"
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
          </div>

          <div className="form-group">
            <label htmlFor="dashboard-event-description">Description</label>
            <textarea
              id="dashboard-event-description"
              name="dashboard-event-description"
              rows={5}
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              required
            ></textarea>
          </div>

          <label className="consent-row dashboard-checkbox-row">
            <input
              type="checkbox"
              name="dashboard-event-featured"
              checked={form.isFeatured}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  isFeatured: event.target.checked,
                }))
              }
            />
            <span>
              Mark as <strong>Featured event</strong> for paid placement on the
              calendar page.
            </span>
          </label>

          <div className="form-group">
            <label htmlFor="dashboard-event-image">Promotional flyer image</label>
            <input
              type="file"
              id="dashboard-event-image"
              name="dashboard-event-image"
              accept="image/*"
              onChange={handleImageChange}
            />
          </div>

          {form.imageDataUrl ? (
            <div className="event-image-preview">
              <img
                src={form.imageDataUrl}
                alt="Event flyer preview"
                className="event-image-preview-media"
              />
            </div>
          ) : null}

          <div className="dashboard-form-actions">
            <button type="submit" className="button">
              {editingEventId || editingSubmissionId ? "Update Event" : "Save Event"}
            </button>
            {editingEventId || editingSubmissionId ? (
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
          <h2 className="panel-title">Calendar feed</h2>
          <span className="dashboard-badge">{events.length} events</span>
        </div>
        <div className="stack-list">
          {events.map((event) => (
            <article key={event.id} className="dashboard-item">
              <div className="dashboard-item-top">
                <div className="dashboard-item-tags">
                  <span className="card-tag">{event.region}</span>
                  {event.isFeatured ? (
                    <span className="dashboard-badge">Featured</span>
                  ) : null}
                </div>
                <div className="dashboard-item-actions">
                  <button
                    type="button"
                    className="dashboard-inline-button"
                    onClick={() => startEditing(event)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="dashboard-remove"
                    onClick={() => deleteEvent(event.id)}
                  >
                    Remove
                  </button>
                </div>
              </div>
              <h3>{event.title}</h3>
              <p>{event.description}</p>
              {event.imageDataUrl ? (
                <img
                  src={event.imageDataUrl}
                  alt={`${event.title} flyer`}
                  className="dashboard-event-image"
                />
              ) : null}
              <p className="dashboard-meta">
                {formatEventDateTime(event.date, event.time)}
                {" · "}
                {event.location}
              </p>
            </article>
          ))}
        </div>
      </div>
    </div>
    </div>
  );
}
