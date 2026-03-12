import { ReactNode } from "react";

type SubmissionPortalShellProps = {
  kicker: string;
  title: string;
  intro: string;
  children: ReactNode;
};

export default function SubmissionPortalShell({
  kicker,
  title,
  intro,
  children,
}: SubmissionPortalShellProps) {
  return (
    <section className="section page-stack">
      <div className="section-header">
        <span className="section-kicker">{kicker}</span>
        <h1 className="heading">{title}</h1>
        <p className="section-intro">{intro}</p>
      </div>
      <div className="dashboard-panel">{children}</div>
    </section>
  );
}
