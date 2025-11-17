import { NextRequest, NextResponse } from "next/server";

import { deleteRecord } from "@/lib/data-store";
import { inferRecordTypeFromId } from "../../handlers/utils";
import { createLogger } from "@/lib/logger";

const logger = createLogger("api:users:delete-by-slug");

export async function deleteUserBySlug(
  _request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;
  const normalized = (slug ?? "").trim().toUpperCase();

  if (!normalized) {
    return NextResponse.json({ message: "slug is required" }, { status: 400 });
  }

  if (!inferRecordTypeFromId(normalized)) {
    return NextResponse.json(
      { message: "record_id must start with INF or IND" },
      { status: 400 }
    );
  }

  try {
    const deleted = await deleteRecord(normalized);
    if (!deleted) {
      return NextResponse.json({ message: "Record not found" }, { status: 404 });
    }

    logger.info("Deleted user record", { recordId: normalized });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    logger.error("Failed to delete user", { error, recordId: normalized });
    return NextResponse.json({ message: "Unable to delete record" }, { status: 500 });
  }
}
