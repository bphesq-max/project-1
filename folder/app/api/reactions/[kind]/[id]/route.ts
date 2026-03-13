import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/auth";
import { type PortalContentKind } from "@/lib/portalContent";
import { getMemberReaction, setMemberReaction, type ReactionValue } from "@/lib/reactions";

function isValidKind(kind: string): kind is PortalContentKind {
  return (
    kind === "candidates" ||
    kind === "events" ||
    kind === "stories" ||
    kind === "organizations"
  );
}

function isValidReaction(reaction: string): reaction is ReactionValue {
  return reaction === "heart" || reaction === "thumbs_up" || reaction === "thumbs_down";
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ kind: string; id: string }> }
) {
  const { kind, id } = await params;
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;

  if (!email) {
    return NextResponse.json({ reaction: null });
  }

  if (!isValidKind(kind)) {
    return NextResponse.json({ error: "Unknown content type." }, { status: 404 });
  }

  const reaction = await getMemberReaction(email, kind, id);
  return NextResponse.json({ reaction: reaction?.reaction ?? null });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ kind: string; id: string }> }
) {
  const { kind, id } = await params;
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;

  if (!email) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  if (!isValidKind(kind)) {
    return NextResponse.json({ error: "Unknown content type." }, { status: 404 });
  }

  const body = (await request.json()) as { reaction?: string };

  if (!body.reaction || !isValidReaction(body.reaction)) {
    return NextResponse.json({ error: "Valid reaction is required." }, { status: 400 });
  }

  const reaction = await setMemberReaction(email, kind, id, body.reaction);
  return NextResponse.json({ reaction: reaction?.reaction ?? null });
}
