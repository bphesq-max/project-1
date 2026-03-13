import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/auth";
import {
  isAdminEmail,
  listMemberAccounts,
  updateMemberRole,
} from "@/lib/memberAccounts";
import { listMemberReactions } from "@/lib/reactions";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!(await isAdminEmail(session?.user?.email))) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const members = await listMemberAccounts();
  const membersWithReactions = await Promise.all(
    members.map(async (member) => ({
      id: member.id,
      email: member.email,
      fullName: member.fullName,
      role: member.role,
      providers: member.providers,
      createdAt: member.createdAt,
      updatedAt: member.updatedAt,
      county: member.profile.county,
      region: member.profile.region,
      reactions: await listMemberReactions(member.email),
    }))
  );

  return NextResponse.json({
    members: membersWithReactions,
  });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const actingEmail = session?.user?.email;

  if (!(await isAdminEmail(actingEmail))) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const body = (await request.json()) as {
    email?: string;
    role?: "member" | "admin";
  };

  if (!body.email || !body.role) {
    return NextResponse.json({ error: "Email and role are required." }, { status: 400 });
  }

  if (actingEmail === body.email && body.role !== "admin") {
    return NextResponse.json(
      { error: "You cannot remove your own admin access." },
      { status: 400 }
    );
  }

  try {
    const member = await updateMemberRole(body.email, body.role);
    return NextResponse.json({
      member: {
        id: member.id,
        email: member.email,
        fullName: member.fullName,
        role: member.role,
        providers: member.providers,
        createdAt: member.createdAt,
        updatedAt: member.updatedAt,
        county: member.profile.county,
        region: member.profile.region,
        reactions: await listMemberReactions(member.email),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update role." },
      { status: 400 }
    );
  }
}
