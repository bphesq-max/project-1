import CalendarEventManager from "../components/CalendarEventManager";

export default function CalendarPage() {
  return (
    <section className="section page-stack">
      <div className="section-header">
        <span className="section-kicker">Events</span>
        <h1 className="heading">Calendar</h1>
        <p className="section-intro">
          Track campaign events, rallies, fundraisers, and organizing deadlines
          in one place.
        </p>
      </div>

      <CalendarEventManager />
    </section>
  );
}
