import { NextRequest, NextResponse } from "next/server";

import {
  ensureSuperAdminAccount,
  findAccountWithSecretByEmail,
  verifyPassword,
} from "@/lib/auth/account-service";
import { createAuthToken, setAuthCookie } from "@/lib/auth/session";
import type { Role } from "@/lib/auth/permissions";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { email?: string; password?: string };
    const email = body.email?.trim().toLowerCase();
    const password = body.password ?? "";

    if (!email || !password) {
      return NextResponse.json({ message: "email and password are required" }, { status: 400 });
    }

    await ensureSuperAdminAccount();

    const account = await findAccountWithSecretByEmail(email);
    if (!account) {
      return NextResponse.json({ message: "Invalid credentials" }, { status: 401 });
    }

    if (!account.passwordHash) {
      return NextResponse.json({ message: "Invalid credentials" }, { status: 401 });
    }

    const isValid = await verifyPassword(password, account.passwordHash);
    if (!isValid) {
      return NextResponse.json({ message: "Invalid credentials" }, { status: 401 });
    }

    const token = createAuthToken({
      sub: account.recordId,
      email: account.email ?? email,
      role: account.role as Role,
    });

    const response = NextResponse.json({
      data: {
        id: account.recordId,
        email: account.email ?? email,
        role: account.role,
        person_record_id: account.recordId,
      },
    });
    setAuthCookie(response, token);
    return response;
  } catch (error) {
    console.error("Login error", error);
    return NextResponse.json({ message: "Unable to login" }, { status: 500 });
  }
}
