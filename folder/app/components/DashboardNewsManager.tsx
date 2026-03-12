"use client";
/* eslint-disable @next/next/no-img-element */

import { ChangeEvent, FormEvent, useState, useSyncExternalStore } from "react";
import {
  defaultStories,
  NewsEntry,
} from "./newsData";
import { fetchLinkPreview } from "./linkPreview";
import { REGION_OPTIONS } from "./memberData";
import {
  deletePortalContent,
  savePortalContentItem,
  usePortalContent,
} from "./portalContentClient";
import {
  StorySubmission,
  persistStorySubmissions,
  readStoredStorySubmissions,
  subscribeToStorySubmissions,
} from "./submissionData";

const initialForm = {
  title: "",
  region: "Statewide",
  status: "Draft",
  category: "Campaign",
  storyType: "article" as "article" | "x-post",
  summary: "",
  body: "",
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

export default function DashboardNewsManager() {
  const { items: stories, setItems: setStories } = usePortalContent("stories", defaultStories);
  const submissions = useSyncExternalStore(
    subscribeToStorySubmissions,
    readStoredStorySubmissions,
    () => []
  );
  const [form, setForm] = useState(initialForm);
  const [editingStoryId, setEditingStoryId] = useState<string | null>(null);
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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextStory: NewsEntry = {
      id: editingStoryId ?? `${form.title}-${Date.now()}`,
      title: form.title.trim(),
      region: form.region,
      status: form.status,
      category: form.category,
      summary: form.summary.trim(),
      body: form.body.trim(),
      storyType: form.storyType,
      isFeatured: form.isFeatured,
      imageDataUrl: form.imageDataUrl || undefined,
      sourceUrl: form.sourceUrl.trim() || undefined,
    };

    try {
      const savedStory = await savePortalContentItem("stories", nextStory);
      setStories(
        editingStoryId
          ? stories.map((story) => (story.id === editingStoryId ? savedStory : story))
          : [...stories, savedStory]
      );
      if (editingSubmissionId) {
        persistStorySubmissions(
          submissions.filter((submission) => submission.submissionId !== editingSubmissionId)
        );
      }
      setForm(initialForm);
      setEditingStoryId(null);
      setEditingSubmissionId(null);
      setMessage(
        editingStoryId ? `Updated "${savedStory.title}".` : `Saved "${savedStory.title}".`
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save story.");
    }
  };

  const startEditing = (story: NewsEntry) => {
    setEditingStoryId(story.id);
    setEditingSubmissionId(null);
    setForm({
      title: story.title,
      region: story.region,
      status: story.status,
      category: story.category,
      storyType: story.storyType ?? "article",
      summary: story.summary,
      body: story.body,
      isFeatured: Boolean(story.isFeatured),
      imageDataUrl: story.imageDataUrl ?? "",
      sourceUrl: story.sourceUrl ?? "",
    });
    setMessage(`Editing "${story.title}".`);
  };

  const cancelEditing = () => {
    setEditingStoryId(null);
    setEditingSubmissionId(null);
    setForm(initialForm);
    setMessage("Edit cancelled.");
  };

  const startEditingSubmission = (submission: StorySubmission) => {
    setEditingStoryId(null);
    setEditingSubmissionId(submission.submissionId);
    setForm({
      title: submission.title,
      region: submission.region,
      status: "Published",
      category: submission.category,
      storyType: submission.storyType ?? "article",
      summary: submission.summary,
      body: submission.body,
      isFeatured: Boolean(submission.isFeatured),
      imageDataUrl: submission.imageDataUrl ?? "",
      sourceUrl: submission.sourceUrl ?? "",
    });
    setMessage(`Reviewing story submission from ${submission.submitterName}.`);
  };

  const publishSubmission = (submission: StorySubmission) => {
    const nextStory: NewsEntry = {
      id: submission.id,
      title: submission.title,
      region: submission.region,
      status: "Published",
      category: submission.category,
      summary: submission.summary,
      body: submission.body,
      storyType: submission.storyType,
      isFeatured: submission.isFeatured,
      imageDataUrl: submission.imageDataUrl,
      sourceUrl: submission.sourceUrl,
    };
    void savePortalContentItem("stories", nextStory)
      .then((savedStory) => {
        setStories([...stories.filter((story) => story.id !== submission.id), savedStory]);
        persistStorySubmissions(
          submissions.filter((entry) => entry.submissionId !== submission.submissionId)
        );
        setMessage(`Published "${submission.title}".`);
      })
      .catch((error) => {
        setMessage(error instanceof Error ? error.message : "Unable to publish story.");
      });
  };

  const deleteSubmission = (submissionId: string) => {
    persistStorySubmissions(
      submissions.filter((submission) => submission.submissionId !== submissionId)
    );
    if (editingSubmissionId === submissionId) {
      cancelEditing();
      return;
    }
    setMessage("Story submission deleted.");
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
        summary:
          current.storyType === "x-post"
            ? current.summary || "Embedded X post"
            : preview.description || current.summary,
        body:
          current.storyType === "x-post"
            ? current.body || "This post is embedded directly from X."
            : current.body || preview.description,
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

  const deleteStory = async (id: string) => {
    try {
      await deletePortalContent("stories", id);
      setStories(stories.filter((story) => story.id !== id));
      if (editingStoryId === id) {
        setEditingStoryId(null);
        setForm(initialForm);
      }
      setMessage("Story removed.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to remove story.");
    }
  };

  return (
    <div className="page-stack">
      <div className="dashboard-panel">
        <div className="panel-header">
          <h2 className="panel-title">Pending story submissions</h2>
          <span className="dashboard-badge">{submissions.length} pending</span>
        </div>
        <div className="stack-list">
          {submissions.length ? submissions.map((submission) => (
            <article key={submission.submissionId} className="dashboard-item">
              <div className="dashboard-item-top">
                <div className="dashboard-item-tags">
                  <span className="card-tag">On hold</span>
                  <span className="dashboard-badge">{submission.region}</span>
                  {submission.storyType === "x-post" ? <span className="dashboard-badge">X Post</span> : null}
                </div>
                <div className="dashboard-item-actions">
                  <button type="button" className="dashboard-inline-button" onClick={() => publishSubmission(submission)}>Publish</button>
                  <button type="button" className="dashboard-inline-button" onClick={() => startEditingSubmission(submission)}>Edit &amp; Publish</button>
                  <button type="button" className="dashboard-remove" onClick={() => deleteSubmission(submission.submissionId)}>Delete</button>
                </div>
              </div>
              <h3>{submission.title}</h3>
              <p>Submitted by {submission.submitterName} ({submission.submitterEmail})</p>
              <p>{submission.summary}</p>
            </article>
          )) : <p className="calendar-empty-copy">No pending story submissions.</p>}
        </div>
      </div>

    <div className="dashboard-grid">
      <div className="dashboard-panel">
        <div className="panel-header">
          <h2 className="panel-title">
            {editingStoryId || editingSubmissionId ? "Edit story" : "Add a story"}
          </h2>
          {editingStoryId ? (
            <button type="button" className="dashboard-inline-button" onClick={cancelEditing}>
              Cancel edit
            </button>
          ) : null}
        </div>

        <form className="member-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="story-title">Headline</label>
            <input
              id="story-title"
              name="story-title"
              type="text"
              value={form.title}
              onChange={(event) =>
                setForm((current) => ({ ...current, title: event.target.value }))
              }
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="story-source-url">Source URL</label>
            <input
              id="story-source-url"
              name="story-source-url"
              type="url"
              value={form.sourceUrl}
              onChange={(event) =>
                setForm((current) => ({ ...current, sourceUrl: event.target.value }))
              }
              placeholder="https://example.com"
            />
          </div>

          <div className="form-group">
            <label htmlFor="story-type">Story type</label>
            <select
              id="story-type"
              name="story-type"
              value={form.storyType}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  storyType: event.target.value as "article" | "x-post",
                }))
              }
            >
              <option value="article">Article</option>
              <option value="x-post">X Post</option>
            </select>
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
              <label htmlFor="story-region">Region</label>
              <select
                id="story-region"
                name="story-region"
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

            <div className="form-group">
              <label htmlFor="story-status">Status</label>
              <select
                id="story-status"
                name="story-status"
                value={form.status}
                onChange={(event) =>
                  setForm((current) => ({ ...current, status: event.target.value }))
                }
              >
                <option>Draft</option>
                <option>Queued</option>
                <option>Published</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="story-category">Category</label>
            <select
              id="story-category"
              name="story-category"
              value={form.category}
              onChange={(event) =>
                setForm((current) => ({ ...current, category: event.target.value }))
              }
            >
              <option>Campaign</option>
              <option>Policy</option>
              <option>Events</option>
              <option>Organization</option>
              <option>Opinion</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="story-summary">Summary</label>
            <textarea
              id="story-summary"
              name="story-summary"
              rows={3}
              value={form.summary}
              onChange={(event) =>
                setForm((current) => ({ ...current, summary: event.target.value }))
              }
              required={form.storyType === "article"}
            ></textarea>
          </div>

          <div className="form-group">
            <label htmlFor="story-body">
              {form.storyType === "x-post" ? "Optional editor note" : "Story body"}
            </label>
            <textarea
              id="story-body"
              name="story-body"
              rows={7}
              value={form.body}
              onChange={(event) =>
                setForm((current) => ({ ...current, body: event.target.value }))
              }
              required={form.storyType === "article"}
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
              Mark as <strong>Featured story</strong> for homepage placement.
            </span>
          </label>

          <div className="form-group">
            <label htmlFor="story-image">Story image</label>
            <input
              id="story-image"
              name="story-image"
              type="file"
              accept="image/*"
              onChange={handleImageChange}
            />
          </div>

          {form.imageDataUrl ? (
            <div className="event-image-preview">
              <img
                src={form.imageDataUrl}
                alt="Story preview"
                className="event-image-preview-media"
              />
            </div>
          ) : null}

          <div className="dashboard-form-actions">
            <button type="submit" className="button">
              {editingStoryId || editingSubmissionId ? "Update Story" : "Save Story"}
            </button>
            {editingStoryId || editingSubmissionId ? (
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
          <h2 className="panel-title">Story list</h2>
          <span className="dashboard-badge">{stories.length} stories</span>
        </div>
        <div className="stack-list">
          {stories.map((story) => (
            <article key={story.id} className="dashboard-item">
              <div className="dashboard-item-top">
                <div className="dashboard-item-tags">
                  <span className="card-tag">{story.region}</span>
                  {story.storyType === "x-post" ? <span className="dashboard-badge">X Post</span> : null}
                  <span className="dashboard-badge">{story.status}</span>
                  {story.isFeatured ? <span className="dashboard-badge">Featured</span> : null}
                </div>
                <div className="dashboard-item-actions">
                  <button
                    type="button"
                    className="dashboard-inline-button"
                    onClick={() => startEditing(story)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="dashboard-remove"
                    onClick={() => deleteStory(story.id)}
                  >
                    Remove
                  </button>
                </div>
              </div>
              <h3>{story.title}</h3>
              <p>{story.summary}</p>
              {story.imageDataUrl ? (
                <img
                  src={story.imageDataUrl}
                  alt={`${story.title} image`}
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
