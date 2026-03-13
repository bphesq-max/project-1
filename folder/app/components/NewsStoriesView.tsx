"use client";

import { defaultStories } from "./newsData";
import { usePortalContent } from "./portalContentClient";
import { buildStoryHref } from "./storyHref";
import XPostEmbed from "./XPostEmbed";
import TrackedContentLink from "./TrackedContentLink";

export default function NewsStoriesView() {
  const { items: stories } = usePortalContent("stories", defaultStories);

  return (
    <div className="dashboard-grid">
      <div className="dashboard-panel">
        <h2 className="panel-title">Current stories</h2>
        <div className="stack-list">
          {stories.map((story) =>
            story.storyType === "x-post" && story.sourceUrl ? (
              <article key={story.id} className="dashboard-item">
                <div className="dashboard-item-top">
                  <div className="dashboard-item-tags">
                    <span className="card-tag">{story.region}</span>
                    <span className="dashboard-badge">X Post</span>
                    <span className="dashboard-badge">{story.status}</span>
                  </div>
                </div>
                <h3>{story.title}</h3>
                <p>{story.summary}</p>
                <XPostEmbed url={story.sourceUrl} />
                <TrackedContentLink
                  href={buildStoryHref(story.id, story)}
                  contentKind="stories"
                  contentId={story.id}
                  title={story.title}
                  className="dashboard-inline-button"
                >
                  Open story page
                </TrackedContentLink>
              </article>
            ) : (
              <TrackedContentLink
                key={story.id}
                href={buildStoryHref(story.id, story)}
                contentKind="stories"
                contentId={story.id}
                title={story.title}
                className="dashboard-item card-link"
              >
                <div className="dashboard-item-top">
                  <div className="dashboard-item-tags">
                    <span className="card-tag">{story.region}</span>
                    {story.storyType === "x-post" ? <span className="dashboard-badge">X Post</span> : null}
                    <span className="dashboard-badge">{story.status}</span>
                  </div>
                </div>
                <h3>{story.title}</h3>
                <p>{story.summary}</p>
              </TrackedContentLink>
            )
          )}
        </div>
      </div>
    </div>
  );
}
