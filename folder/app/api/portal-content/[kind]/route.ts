import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/auth";
import { isAdminEmail } from "@/lib/memberAccounts";
import {
  listPortalContent,
  type PortalContentKind,
  upsertPortalContentItem,
} from "@/lib/portalContent";

function isValidKind(kind: string): kind is PortalContentKind {
  return (
    kind === "candidates" ||
    kind === "events" ||
    kind === "stories" ||
    kind === "organizations"
  );
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ kind: string }> }
) {
  const { kind } = await params;

  if (!isValidKind(kind)) {
    return NextResponse.json({ error: "Unknown content type." }, { status: 404 });
  }

  const items = await listPortalContent(kind);
  return NextResponse.json({ items });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ kind: string }> }
) {
  const { kind } = await params;

  if (!isValidKind(kind)) {
    return NextResponse.json({ error: "Unknown content type." }, { status: 404 });
  }

  const session = await getServerSession(authOptions);

  if (!(await isAdminEmail(session?.user?.email))) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const body = (await request.json()) as { item?: unknown };

  if (!body.item || typeof body.item !== "object") {
    return NextResponse.json({ error: "Content item is required." }, { status: 400 });
  }

  const item = await upsertPortalContentItem(kind, body.item as never);
  return NextResponse.json({ item });
}
