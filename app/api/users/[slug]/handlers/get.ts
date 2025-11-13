import { NextRequest, NextResponse } from "next/server";

import { getRecord, listRecords } from "@/lib/data-store";
import { toPersonResponse, toPersonResponseList } from "@/app/api/utils/serialize-person-record";
import { buildFiltersFromSearchParams, inferRecordTypeFromId } from "../../handlers/utils";

export async function getUserBySlug(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;
  const normalized = (slug ?? "").trim().toUpperCase();

  if (!normalized) {
    return NextResponse.json({ message: "slug is required" }, { status: 400 });
  }

  if (normalized === "INF" || normalized === "IND") {
    const recordType = normalized === "INF" ? "influencer" : "individual";
    const records = await listRecords(
      recordType,
      buildFiltersFromSearchParams(recordType, request.nextUrl.searchParams)
    );

    return NextResponse.json({ data: toPersonResponseList(records) });
  }

  const recordType = inferRecordTypeFromId(normalized);
  if (!recordType) {
    return NextResponse.json(
      { message: "record_id must start with INF or IND" },
      { status: 400 }
    );
  }

  const record = await getRecord(recordType, normalized);
  if (!record) {
    return NextResponse.json({ message: "Record not found" }, { status: 404 });
  }

  return NextResponse.json({ data: toPersonResponse(record) });
}
