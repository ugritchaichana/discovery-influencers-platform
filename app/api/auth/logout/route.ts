import { NextResponse } from "next/server";

import { clearAuthCookie } from "@/lib/auth/session";
import { createLogger } from "@/lib/logger";

const logger = createLogger("api:auth:logout");

export async function POST() {
  const response = NextResponse.json({ message: "Logged out" });
  clearAuthCookie(response);
  logger.info("Logout success");
  return response;
}
