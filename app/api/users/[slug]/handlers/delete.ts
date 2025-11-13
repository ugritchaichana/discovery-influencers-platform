import { NextRequest, NextResponse } from "next/server";

import { deleteRecord } from "@/lib/data-store";
import { inferRecordTypeFromId } from "../../handlers/utils";

export async function deleteUserBySlug(
  _request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;
  const normalized = (slug ?? "").trim().toUpperCase();

  if (!normalized) {
    return NextResponse.json({ message: "slug is required" }, { status: 400 });
  }

  const recordType = inferRecordTypeFromId(normalized);
  if (!recordType) {
    return NextResponse.json(
      { message: "record_id must start with INF or IND" },
      { status: 400 }
    );
  }

  const deleted = await deleteRecord(recordType, normalized);
  if (!deleted) {
    return NextResponse.json({ message: "Record not found" }, { status: 404 });
  }

  return new NextResponse(null, { status: 204 });
}
