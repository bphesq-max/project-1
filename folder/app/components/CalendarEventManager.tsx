"use client";
/* eslint-disable @next/next/no-img-element */

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import {
  formatEventDateTime,
  readStoredEvents,
  subscribeToStoredEvents,
  toDateKey,
} from "./eventData";

const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const viewModes = ["day", "week", "month"] as const;

type ViewMode = (typeof viewModes)[number];

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function startOfWeek(date: Date) {
  return addDays(date, -date.getDay());
}

function getCalendarDays(anchorDate: Date) {
  const startOfMonth = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1);
  const endOfMonth = new Date(anchorDate.getFullYear(), anchorDate.getMonth() + 1, 0);
  const firstDayIndex = startOfMonth.getDay();
  const totalDays = endOfMonth.getDate();
  const days: Array<Date | null> = [];

  for (let index = 0; index < firstDayIndex; index += 1) {
    days.push(null);
  }

  for (let day = 1; day <= totalDays; day += 1) {
    days.push(new Date(anchorDate.getFullYear(), anchorDate.getMonth(), day));
  }

  while (days.length % 7 !== 0) {
    days.push(null);
  }

  return days;
}

function getWeekDays(anchorDate: Date) {
  const weekStart = startOfWeek(anchorDate);
  return Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
}

export default function CalendarEventManager() {
  const events = useSyncExternalStore(
    subscribeToStoredEvents,
    readStoredEvents,
    readStoredEvents
  );
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [anchor, setAnchor] = useState(() =>
    events.length ? new Date(`${events[0].date}T12:00:00`) : new Date()
  );

  const monthLabel = anchor.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
  const calendarDays = getCalendarDays(anchor);
  const weekDays = getWeekDays(anchor);
  const now = new Date();
  const featuredEvents = events.filter((event) => {
    if (!event.isFeatured) {
      return false;
    }

    const eventEnd = new Date(`${event.date}T${event.time || "23:59"}:00`);
    return eventEnd >= now;
  });

  const visibleEvents = events.filter((event) => {
    const eventDate = new Date(`${event.date}T12:00:00`);

    if (viewMode === "day") {
      return toDateKey(eventDate) === toDateKey(anchor);
    }

    if (viewMode === "week") {
      const weekStart = startOfWeek(anchor);
      const weekEnd = addDays(weekStart, 6);
      return eventDate >= weekStart && eventDate <= weekEnd;
    }

    return (
      eventDate.getMonth() === anchor.getMonth() &&
      eventDate.getFullYear() === anchor.getFullYear()
    );
  });

  const stepCalendar = (direction: -1 | 1) => {
    const next = new Date(anchor);

    if (viewMode === "day") {
      next.setDate(next.getDate() + direction);
    } else if (viewMode === "week") {
      next.setDate(next.getDate() + direction * 7);
    } else {
      next.setMonth(next.getMonth() + direction);
    }

    setAnchor(next);
  };

  return (
    <div className="page-stack">
      <section className="dashboard-panel calendar-featured-section">
        <div className="panel-header">
          <h2 className="panel-title">Featured Events</h2>
          <span className="dashboard-badge">Paid placement</span>
        </div>

        <div className="calendar-featured-grid">
          {featuredEvents.length ? (
            featuredEvents.map((event) => (
              <Link key={event.id} href={`/events/${event.id}`} target="_blank" rel="noreferrer" className="calendar-featured-card card-link">
                <span className="card-tag">{event.region}</span>
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
              </Link>
            ))
          ) : (
            <article className="calendar-featured-placeholder">
              <span className="card-tag">Premium</span>
              <h3>No featured events scheduled</h3>
              <p>
                Featured placements appear here automatically when they are
                marked as featured on the dashboard and the event date has not
                passed yet.
              </p>
            </article>
          )}
        </div>
      </section>

      <div className="dashboard-panel calendar-panel">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">{monthLabel}</h2>
            <p className="calendar-subtitle">
              {viewMode === "day"
                ? "Single-day view"
                : viewMode === "week"
                  ? "One-week view"
                  : "Full-month view"}
            </p>
          </div>
          <span className="dashboard-badge">{visibleEvents.length} visible events</span>
        </div>

        <div className="calendar-toolbar">
          <div className="calendar-nav">
            <button type="button" className="calendar-nav-button" onClick={() => stepCalendar(-1)}>
              Prev
            </button>
            <button
              type="button"
              className="calendar-nav-button"
              onClick={() => setAnchor(new Date())}
            >
              Today
            </button>
            <button type="button" className="calendar-nav-button" onClick={() => stepCalendar(1)}>
              Next
            </button>
          </div>

          <div className="calendar-view-toggle" aria-label="Calendar view options">
            {viewModes.map((mode) => (
              <button
                key={mode}
                type="button"
                className={`calendar-view-button${viewMode === mode ? " is-active" : ""}`}
                onClick={() => setViewMode(mode)}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        {viewMode === "month" ? (
          <div className="calendar-grid" aria-label={`${monthLabel} calendar`}>
            {weekdayLabels.map((label) => (
              <div key={label} className="calendar-weekday">
                {label}
              </div>
            ))}

            {calendarDays.map((day, index) => {
              const isoDate = day ? toDateKey(day) : "";
              const dayEvents = day ? events.filter((event) => event.date === isoDate) : [];

              return (
                <div
                  key={day ? isoDate : `empty-${index}`}
                  className={`calendar-cell${day ? "" : " calendar-cell-empty"}`}
                >
                  {day ? <div className="calendar-day-number">{day.getDate()}</div> : null}
                  <div className="calendar-day-events">
                    {dayEvents.map((event) => (
                      <article key={event.id} className="calendar-event-chip">
                        <strong>{event.title}</strong>
                        <span>{event.time || "All day"}</span>
                        <div className="calendar-tooltip">
                          {event.imageDataUrl ? (
                            <img
                              src={event.imageDataUrl}
                              alt={`${event.title} flyer`}
                              className="calendar-tooltip-image"
                            />
                          ) : null}
                          <strong>{event.title}</strong>
                          <span>{formatEventDateTime(event.date, event.time)}</span>
                          <span>{event.location}</span>
                          <p>{event.description}</p>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : viewMode === "week" ? (
          <div className="calendar-week-layout">
            {weekDays.map((day) => {
              const isoDate = toDateKey(day);
              const dayEvents = events.filter((event) => event.date === isoDate);

              return (
                <section key={isoDate} className="calendar-week-column">
                  <div className="calendar-week-header">
                    <span>{day.toLocaleDateString("en-US", { weekday: "short" })}</span>
                    <strong>{day.getDate()}</strong>
                  </div>
                  <div className="calendar-week-events">
                    {dayEvents.length ? (
                      dayEvents.map((event) => (
                        <article key={event.id} className="calendar-event-chip calendar-event-chip-block">
                          <strong>{event.title}</strong>
                          <span>{event.time || "All day"}</span>
                          <div className="calendar-tooltip">
                            {event.imageDataUrl ? (
                              <img
                                src={event.imageDataUrl}
                                alt={`${event.title} flyer`}
                                className="calendar-tooltip-image"
                              />
                            ) : null}
                            <strong>{event.title}</strong>
                            <span>{formatEventDateTime(event.date, event.time)}</span>
                            <span>{event.location}</span>
                            <p>{event.description}</p>
                          </div>
                        </article>
                      ))
                    ) : (
                      <p className="calendar-empty-copy">No events scheduled.</p>
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        ) : (
          <div className="calendar-day-layout">
            <div className="calendar-day-detail">
              <h3>
                {anchor.toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </h3>
              <div className="stack-list">
                {visibleEvents.length ? (
                  visibleEvents.map((event) => (
                    <article key={event.id} className="dashboard-item">
                      <span className="card-tag">{event.region}</span>
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
                  ))
                ) : (
                  <article className="dashboard-item">
                    <h3>No events scheduled</h3>
                    <p>There are no calendar entries for this day yet.</p>
                  </article>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
