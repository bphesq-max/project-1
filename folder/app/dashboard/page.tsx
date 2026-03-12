import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/auth";
import DashboardAdminTabs from "../components/DashboardAdminTabs";
import { isAdminEmail } from "@/lib/memberAccounts";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect("/members");
  }

  if (!(await isAdminEmail(session.user.email))) {
    redirect("/");
  }

  return (
    <section className="section page-stack">
      <div className="section-header">
        <span className="section-kicker">Admin hub</span>
        <h1 className="heading">Dashboard</h1>
        <p className="section-intro">
          Manage content, publish news stories, and keep the campaign calendar
          current from one control center.
        </p>
        <Link href="/analytics" className="dashboard-inline-button">
          Open analytics
        </Link>
      </div>

      <DashboardAdminTabs />
    </section>
  );
}
