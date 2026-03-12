"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { defaultEvents, formatEventDateTime, readStoredEvents, subscribeToStoredEvents } from "./eventData";

const subscribeToHydration = () => () => {};

export default function EventDetailView({ id }: { id: string }) {
  const hasHydrated = useSyncExternalStore(subscribeToHydration, () => true, () => false);
  const events = useSyncExternalStore(
    subscribeToStoredEvents,
    readStoredEvents,
    () => defaultEvents
  );
  const event = events.find((entry) => entry.id === id);

  if (!hasHydrated) {
    return <section className="section"><p>Loading event...</p></section>;
  }

  if (!event) {
    return <section className="section"><p>Event not found.</p></section>;
  }

  return (
    <section className="section page-stack">
      <Link href="/calendar" className="dashboard-inline-button">Back to calendar</Link>
      <div className="dashboard-panel">
        <span className="card-tag">{event.region}</span>
        <h1 className="heading">{event.title}</h1>
        <p className="section-intro">{formatEventDateTime(event.date, event.time)} · {event.location}</p>
        {event.sourceUrl ? (
          <a href={event.sourceUrl} target="_blank" rel="noreferrer" className="external-link">
            Visit event site
          </a>
        ) : null}
        {event.imageDataUrl ? <img src={event.imageDataUrl} alt={event.title} className="detail-image" /> : null}
        <p className="detail-body">{event.description}</p>
      </div>
    </section>
  );
}
