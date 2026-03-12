import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/auth";
import { isAdminEmail } from "@/lib/memberAccounts";
import AnalyticsClientView from "../components/AnalyticsClientView";

export default async function AnalyticsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect("/members");
  }

  if (!(await isAdminEmail(session.user.email))) {
    redirect("/");
  }

  return <AnalyticsClientView />;
}
