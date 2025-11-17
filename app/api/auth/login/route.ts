import { NextRequest, NextResponse } from "next/server";

import {
  ensureSuperAdminAccount,
  findAccountWithSecretByEmail,
  verifyPassword,
} from "@/lib/auth/account-service";
import { createAuthToken, setAuthCookie } from "@/lib/auth/session";
import type { Role } from "@/lib/auth/permissions";
import { createLogger } from "@/lib/logger";

const logger = createLogger("api:auth:login");

export async function POST(request: NextRequest) {
  let email: string | undefined;
  try {
    const body = (await request.json()) as { email?: string; password?: string };
    email = body.email?.trim().toLowerCase();
    const password = body.password ?? "";

    if (!email || !password) {
      return NextResponse.json({ message: "email and password are required" }, { status: 400 });
    }

    logger.info("Login attempt", { email });

    await ensureSuperAdminAccount();

    const account = await findAccountWithSecretByEmail(email);
    if (!account) {
      logger.warn("Login failed: unknown email", { email });
      return NextResponse.json({ message: "Invalid credentials" }, { status: 401 });
    }

    if (!account.passwordHash) {
      logger.warn("Login failed: missing password hash", { accountId: account.recordId });
      return NextResponse.json({ message: "Invalid credentials" }, { status: 401 });
    }

    const isValid = await verifyPassword(password, account.passwordHash);
    if (!isValid) {
      logger.warn("Login failed: password mismatch", { accountId: account.recordId });
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
    logger.info("Login successful", { accountId: account.recordId, role: account.role });
    return response;
  } catch (error) {
    logger.error("Login error", { error, email });
    return NextResponse.json({ message: "Unable to login" }, { status: 500 });
  }
}
