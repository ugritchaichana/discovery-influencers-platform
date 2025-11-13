import { NextRequest, NextResponse } from "next/server";

import { listRecords } from "@/lib/data-store";
import { toPersonResponseList } from "@/app/api/utils/serialize-person-record";
import { RecordType } from "@/lib/types";
import { buildFiltersFromSearchParams, parseRecordTypeInput } from "./utils";

export async function getUsers(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const recordTypeRaw = searchParams.get("record_type") ?? searchParams.get("recordType");
  const recordType = parseRecordTypeInput(recordTypeRaw);

  if (recordTypeRaw && !recordType) {
    return NextResponse.json(
      { message: 'record_type must be either "individual" or "influencer"' },
      { status: 400 }
    );
  }

  const recordTypes: RecordType[] = recordType ? [recordType] : ["individual", "influencer"];

  const results = await Promise.all(
    recordTypes.map((type) => listRecords(type, buildFiltersFromSearchParams(type, searchParams)))
  );

  const combined = results
    .flat()
    .sort((a, b) => a.recordId.localeCompare(b.recordId));

  return NextResponse.json({ data: toPersonResponseList(combined) });
}
