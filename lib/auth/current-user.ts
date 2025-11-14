import { cookies } from "next/headers";
import type { NextRequest } from "next/server";

import { getAccountById } from "./account-service";
import type { Role } from "./permissions";
import { AUTH_COOKIE_NAME, getAuthClaims, verifyAuthToken } from "./session";

export type AuthenticatedUser = {
  id: string;
  email: string;
  role: Role;
  personRecordId: string | null;
};

export async function getCurrentUser(request: NextRequest): Promise<AuthenticatedUser | null> {
  const claims = getAuthClaims(request);
  if (!claims) {
    return null;
  }

  return resolveAuthenticatedUser(claims.sub);
}

export async function requireCurrentUser(request: NextRequest): Promise<AuthenticatedUser> {
  const user = await getCurrentUser(request);
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
}

export async function getCurrentUserFromCookies(): Promise<AuthenticatedUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value ?? null;
  if (!token) {
    return null;
  }

  const claims = verifyAuthToken(token);
  if (!claims) {
    return null;
  }

  return resolveAuthenticatedUser(claims.sub);
}

async function resolveAuthenticatedUser(accountId: string): Promise<AuthenticatedUser | null> {
  const account = await getAccountById(accountId);
  if (!account) {
    return null;
  }

  return {
    id: account.id,
    email: account.email,
    role: account.role,
    personRecordId: account.personRecordId,
  };
}
