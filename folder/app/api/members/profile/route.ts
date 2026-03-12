import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/auth";
import { getRegionForCounty, type MemberProfile } from "@/app/components/memberData";
import { readMemberProfile, updateMemberProfile } from "@/lib/memberAccounts";

export async function GET() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;

  if (!email) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const profile = await readMemberProfile(email);
  return NextResponse.json({ profile: profile ?? { email } });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;

  if (!email) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json()) as MemberProfile;
  const nextProfile = {
    ...body,
    email,
    fullName: body.fullName?.trim() || session.user?.name || undefined,
    region: getRegionForCounty(body.county),
  };

  const profile = await updateMemberProfile(email, nextProfile);
  return NextResponse.json({ profile });
}
