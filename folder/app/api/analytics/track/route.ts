import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/auth";
import { recordAnalyticsEvent } from "@/lib/siteAnalytics";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      sessionId?: string;
      eventType?: "page_view" | "content_click";
      path?: string;
      previousPath?: string;
      referrerUrl?: string;
      referrerHost?: string;
      targetPath?: string;
      contentKind?: "candidates" | "events" | "stories" | "organizations";
      contentId?: string;
      title?: string;
    };

    if (!body.sessionId || !body.eventType || !body.path) {
      return NextResponse.json({ error: "Missing analytics fields." }, { status: 400 });
    }

    const session = await getServerSession(authOptions);

    await recordAnalyticsEvent({
      sessionId: body.sessionId,
      memberEmail: session?.user?.email ?? undefined,
      eventType: body.eventType,
      path: body.path,
      previousPath: body.previousPath,
      referrerUrl: body.referrerUrl,
      referrerHost: body.referrerHost,
      targetPath: body.targetPath,
      contentKind: body.contentKind,
      contentId: body.contentId,
      title: body.title,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Unable to record analytics event." }, { status: 500 });
  }
}
