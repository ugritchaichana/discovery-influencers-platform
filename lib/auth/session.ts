import jwt from "jsonwebtoken";
import type { NextRequest, NextResponse } from "next/server";
import type { SignOptions } from "jsonwebtoken";

import type { Role } from "./permissions";

export const AUTH_COOKIE_NAME = "auth_token";
const AUTH_HEADER = "authorization";
const DEFAULT_EXPIRES_IN: SignOptions["expiresIn"] = "7d";
const DEFAULT_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

type AuthClaims = {
  sub: string;
  email: string;
  role: Role;
};

type AuthTokenOptions = {
  expiresIn?: SignOptions["expiresIn"];
};

function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET environment variable is not set");
  }
  return secret;
}

export function createAuthToken(
  payload: AuthClaims,
  options: AuthTokenOptions = {}
): string {
  const secret = getAuthSecret();
  const signOptions: SignOptions = {
    expiresIn: options.expiresIn ?? DEFAULT_EXPIRES_IN,
  };
  return jwt.sign(payload, secret, signOptions);
}

export function verifyAuthToken(token: string): AuthClaims | null {
  try {
    const secret = getAuthSecret();
    return jwt.verify(token, secret) as AuthClaims;
  } catch {
    return null;
  }
}

export function setAuthCookie(response: NextResponse, token: string) {
  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: DEFAULT_MAX_AGE,
  });
}

export function clearAuthCookie(response: NextResponse) {
  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: "",
    expires: new Date(0),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
}

export function getTokenFromRequest(request: NextRequest): string | null {
  const headerToken = request.headers.get(AUTH_HEADER);
  if (headerToken?.startsWith("Bearer ")) {
    return headerToken.slice("Bearer ".length);
  }

  const cookieToken = request.cookies.get(AUTH_COOKIE_NAME)?.value ?? null;
  return cookieToken;
}

export function getAuthClaims(request: NextRequest): AuthClaims | null {
  const token = getTokenFromRequest(request);
  if (!token) {
    return null;
  }
  return verifyAuthToken(token);
}

export function requireAuthClaims(request: NextRequest): AuthClaims {
  const claims = getAuthClaims(request);
  if (!claims) {
    throw new Error("Unauthorized");
  }
  return claims;
}
