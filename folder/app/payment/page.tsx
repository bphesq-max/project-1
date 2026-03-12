export default function PaymentPage() {
  return (
    <section className="section page-stack">
      <section className="promo-hero">
        <div className="promo-hero-copy">
          <span className="eyebrow promo-eyebrow">California statewide directory</span>
          <h1>Promotion, discovery, and campaign visibility in one place.</h1>
          <p>
            Paid options help campaigns, organizations, and events stand out with
            stronger placement across the site while public access remains free.
          </p>
          <div className="hero-buttons">
            <a href="/content" className="button">
              Browse Content
            </a>
            <a href="#paid-options" className="button button-secondary">
              View Packages
            </a>
          </div>
        </div>

        <aside className="promo-hero-panel">
          <div className="hero-panel-label">Portal highlights</div>
          <ul className="hero-panel-list">
            <li>Candidate listings with featured placement</li>
            <li>Organization profiles for statewide and local groups</li>
            <li>Event promotion for fundraisers, rallies, and outreach</li>
          </ul>
        </aside>
      </section>

      <section className="section-header">
        <span className="section-kicker">Paid Options</span>
        <h2 className="heading" id="paid-options">Choose the visibility that fits your campaign</h2>
        <p className="section-intro">
          Start with a simple placement or move into premium promotion for longer
          runs, stronger event exposure, and more prominent campaign visibility.
        </p>
      </section>

      <div className="pricing-cards">
        <div className="pricing-card pricing-card-emphasis">
          <h2>Basic</h2>
          <p className="pricing-price">$99</p>
          <p>One week featured listing</p>
          <p className="pricing-note">Best for a quick spotlight on a race, group, or event.</p>
        </div>
        <div className="pricing-card pricing-card-emphasis">
          <h2>Standard</h2>
          <p className="pricing-price">$249</p>
          <p>Two weeks featured listing + social shoutout</p>
          <p className="pricing-note">Good for growing visibility around campaign momentum.</p>
        </div>
        <div className="pricing-card pricing-card-emphasis">
          <h2>Premium</h2>
          <p className="pricing-price">$499</p>
          <p>One month featured listing + newsletter mention</p>
          <p className="pricing-note">Built for major pushes, fundraisers, and sustained exposure.</p>
        </div>
      </div>

      <div className="dashboard-panel">
        <h2 className="panel-title">Request a paid placement</h2>
        <form className="member-form">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="name">Full Name</label>
              <input type="text" id="name" name="name" />
            </div>
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input type="email" id="email" name="email" />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="package">Select Package</label>
              <select id="package" name="package">
                <option>Basic</option>
                <option>Standard</option>
                <option>Premium</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="organization">Campaign or Organization</label>
              <input type="text" id="organization" name="organization" />
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="message">Campaign Message or Notes</label>
            <textarea id="message" name="message" rows={5}></textarea>
          </div>
          <button type="submit" className="button">
            Submit Request
          </button>
        </form>
      </div>
    </section>
  );
}
