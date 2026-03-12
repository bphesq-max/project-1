import Link from "next/link";

const submissionOptions = [
  {
    href: "/submit/candidate",
    kicker: "Candidate portal",
    title: "Submit your candidate profile",
    description:
      "Campaigns can send biographies, district labels, social links, and website details for admin review.",
  },
  {
    href: "/submit/event",
    kicker: "Event portal",
    title: "Submit your event",
    description:
      "Organizers can send rallies, fundraisers, town halls, and filing-deadline events for publication review.",
  },
  {
    href: "/submit/organization",
    kicker: "Organization portal",
    title: "Submit your conservative organization",
    description:
      "Local clubs, PACs, coalitions, and county groups can submit their information to be reviewed by an admin.",
  },
  {
    href: "/submit/story",
    kicker: "Story portal",
    title: "Submit your story",
    description:
      "Send an article, press release, or X post. It stays on hold until an admin edits and publishes it.",
  },
];

export default function SubmissionPortalPage() {
  return (
    <section className="section page-stack">
      <div className="section-header">
        <span className="section-kicker">Submission portal</span>
        <h1 className="heading">Choose what you want to submit</h1>
        <p className="section-intro">
          Every submission goes into admin review first. Nothing appears on the public site until it is approved.
        </p>
      </div>

      <div className="submission-grid">
        {submissionOptions.map((option) => (
          <Link key={option.href} href={option.href} className="card card-link submission-card">
            <span className="card-tag">{option.kicker}</span>
            <h2>{option.title}</h2>
            <p>{option.description}</p>
            <span className="dashboard-inline-button">Open form</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
