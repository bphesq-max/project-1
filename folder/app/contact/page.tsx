import Link from "next/link";

export default function ContactPage() {
  return (
    <section className="section page-stack">
      <div className="section-header">
        <span className="section-kicker">Contact us</span>
        <h1 className="heading">Get in touch</h1>
        <p className="section-intro">
          Reach out about listings, paid promotion, featured events, site
          questions, or general feedback.
        </p>
      </div>

      <div className="dashboard-panel">
        <div className="page-stack">
          <div>
            <h2 className="panel-title">Submission portal</h2>
            <p className="section-intro">
              Candidates, event organizers, conservative groups, and story submitters should start at the submission portal.
            </p>
          </div>
          <Link href="/submit" className="button">Open submission portal</Link>
        </div>
      </div>

      <div className="dashboard-panel">
        <form className="member-form">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="contact-name">Full Name</label>
              <input type="text" id="contact-name" name="contact-name" />
            </div>
            <div className="form-group">
              <label htmlFor="contact-email">Email Address</label>
              <input type="email" id="contact-email" name="contact-email" />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="contact-subject">Subject</label>
            <input type="text" id="contact-subject" name="contact-subject" />
          </div>

          <div className="form-group">
            <label htmlFor="contact-message">Message</label>
            <textarea id="contact-message" name="contact-message" rows={6}></textarea>
          </div>

          <button type="submit" className="button">
            Send Message
          </button>
        </form>
      </div>
    </section>
  );
}
