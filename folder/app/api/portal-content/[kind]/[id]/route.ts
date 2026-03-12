import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/auth";
import { isAdminEmail } from "@/lib/memberAccounts";
import {
  deletePortalContentItem,
  readPortalContentItem,
  type PortalContentKind,
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
  { params }: { params: Promise<{ kind: string; id: string }> }
) {
  const { kind, id } = await params;

  if (!isValidKind(kind)) {
    return NextResponse.json({ error: "Unknown content type." }, { status: 404 });
  }

  const item = await readPortalContentItem(kind, id);

  if (!item) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  return NextResponse.json({ item });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ kind: string; id: string }> }
) {
  const { kind, id } = await params;

  if (!isValidKind(kind)) {
    return NextResponse.json({ error: "Unknown content type." }, { status: 404 });
  }

  const session = await getServerSession(authOptions);

  if (!(await isAdminEmail(session?.user?.email))) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  await deletePortalContentItem(kind, id);
  return NextResponse.json({ success: true });
}
