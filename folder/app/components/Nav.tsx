/* eslint-disable @next/next/no-img-element */

import Link from "next/link";

const links = [
  { href: "/", label: "Home" },
  { href: "/content", label: "Content" },
  { href: "/news", label: "News" },
  { href: "/calendar", label: "Calendar" },
  { href: "/payment", label: "Paid Options" },
  { href: "/members", label: "Members" },
];

export default function Nav() {
  return (
    <nav className="nav">
      <div className="container nav-container">
        <Link href="/" className="nav-brand" aria-label="Restore the Golden State home">
          <span className="nav-brand-mark" aria-hidden="true">
            <img
              src="https://upload.wikimedia.org/wikipedia/commons/c/c7/Bear_of_California_%28gold%29.svg"
              alt=""
              className="nav-brand-bear"
            />
          </span>
          <span className="nav-brand-copy">
            <strong>Restore the Golden State</strong>
            <span>Statewide directory and action hub</span>
          </span>
        </Link>

        <div className="nav-links">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="nav-link">
              {link.label}
            </Link>
          ))}
          <a
            href="https://x.com/monte_ray_831"
            className="nav-link nav-social"
            target="_blank"
            rel="noreferrer"
          >
            Follow on X
          </a>
        </div>
      </div>
    </nav>
  );
}
