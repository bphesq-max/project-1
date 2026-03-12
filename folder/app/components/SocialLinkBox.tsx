type SocialLinkBoxProps = {
  xUrl?: string;
  facebookUrl?: string;
  instagramUrl?: string;
};

const socialLinks = [
  { key: "xUrl", label: "X" },
  { key: "facebookUrl", label: "Facebook" },
  { key: "instagramUrl", label: "Instagram" },
] as const;

export default function SocialLinkBox({ xUrl, facebookUrl, instagramUrl }: SocialLinkBoxProps) {
  const links = {
    xUrl,
    facebookUrl,
    instagramUrl,
  };
  const hasLinks = Object.values(links).some(Boolean);

  if (!hasLinks) {
    return null;
  }

  return (
    <div className="social-link-box">
      <span className="card-tag">Social media</span>
      <div className="social-link-grid">
        {socialLinks.map((item) =>
          links[item.key] ? (
            <a
              key={item.key}
              href={links[item.key]}
              target="_blank"
              rel="noreferrer"
              className="social-link-button"
            >
              {item.label}
            </a>
          ) : null
        )}
      </div>
    </div>
  );
}
