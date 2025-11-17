import { NextRequest, NextResponse } from "next/server";

import { createAccount, listAccounts } from "@/lib/auth/account-service";
import { canCreateRole, type Role } from "@/lib/auth/permissions";
import { getCurrentUser } from "@/lib/auth/current-user";
import { createLogger } from "@/lib/logger";

const logger = createLogger("api:auth:users");

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (currentUser.role === "user") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const accounts = await listAccounts();
    logger.info("Listed accounts", { actorId: currentUser.id, count: accounts.length });
    return NextResponse.json({ data: accounts });
  } catch (error) {
    logger.error("List accounts error", { error });
    return NextResponse.json({ message: "Unable to list accounts" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const currentUser = await getCurrentUser(request);
  if (!currentUser) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      email?: string;
      password?: string;
      role?: Role;
      person_record_id?: string;
    };

    const email = body.email?.trim().toLowerCase();
    const password = body.password ?? "";
    const role = body.role ?? "user";
    const personRecordId = body.person_record_id ?? null;

    if (!email || !password) {
      return NextResponse.json({ message: "email and password are required" }, { status: 400 });
    }

    if (!canCreateRole(currentUser.role, role)) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    logger.info("Create account request", { actorId: currentUser.id, role });

    const account = await createAccount({
      email,
      password,
      role,
      personRecordId,
    });

    logger.info("Account created", { actorId: currentUser.id, accountId: account.id, role: account.role });
    return NextResponse.json({ data: account }, { status: 201 });
  } catch (error) {
    logger.error("Create account error", { error });
    return NextResponse.json({ message: "Unable to create account" }, { status: 500 });
  }
}
