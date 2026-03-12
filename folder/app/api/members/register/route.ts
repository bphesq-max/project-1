import { NextResponse } from "next/server";

import { createCredentialsAccount } from "@/lib/memberAccounts";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      fullName?: string;
      email?: string;
      password?: string;
    };

    const fullName = body.fullName?.trim() || "";
    const email = body.email?.trim() || "";
    const password = body.password || "";

    if (!fullName || !email || !password) {
      return NextResponse.json(
        { error: "Name, email, and password are required." },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }

    await createCredentialsAccount({ fullName, email, password });
    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to create member account.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
