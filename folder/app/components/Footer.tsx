import Link from "next/link";

const footerLinks = [
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact us" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/payment", label: "Paid Options" },
];

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container site-footer-container">
        <div className="site-footer-copy">
          <strong>Restore the Golden State</strong>
          <p>
            California conservatives in one place. News, events, candidates, and
            organizations without the clutter.
          </p>
        </div>

        <div className="site-footer-tools">
          <form className="site-footer-search" action="/search" method="get">
            <label htmlFor="footer-search" className="site-footer-search-label">
              Search the site
            </label>
            <div className="site-footer-search-row">
              <input
                id="footer-search"
                name="q"
                type="search"
                placeholder="Candidates, news, events, organizations"
                className="site-footer-search-input"
              />
              <button type="submit" className="button site-footer-search-button">
                Search
              </button>
            </div>
          </form>

          <nav className="site-footer-nav" aria-label="Footer links">
            {footerLinks.map((link) => (
              <Link key={link.href} href={link.href} className="site-footer-link">
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
