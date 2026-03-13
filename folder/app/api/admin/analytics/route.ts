import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/auth";
import { isAdminEmail } from "@/lib/memberAccounts";
import { getAnalyticsOverview } from "@/lib/siteAnalytics";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!(await isAdminEmail(session?.user?.email))) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const overview = await getAnalyticsOverview();
  return NextResponse.json(overview);
}
