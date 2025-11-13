import { NextRequest, NextResponse } from "next/server";

import { DistinctField, listDistinctFieldValues } from "@/lib/data-store";
import { parseRecordTypeInput } from "../../../users/handlers/utils";

const PARAM_TO_FIELD: Record<string, DistinctField> = {
  influencer_category: "influencerCategory",
  engagement_rate_tier: "engagementRateTier",
  city: "city",
  collaboration_status: "collaborationStatus",
};

export async function getUserParam(
  request: NextRequest,
  context: { params: Promise<{ param: string }> }
) {
  const { param } = await context.params;
  const normalized = param?.trim().toLowerCase();

  if (!normalized) {
    return NextResponse.json({ message: "param is required" }, { status: 400 });
  }

  const field = PARAM_TO_FIELD[normalized];
  if (!field) {
    return NextResponse.json({ message: "Unsupported param" }, { status: 404 });
  }

  const recordTypeInput =
    request.nextUrl.searchParams.get("record_type") ??
    request.nextUrl.searchParams.get("recordType");
  const recordType = parseRecordTypeInput(recordTypeInput);

  if (recordTypeInput && !recordType) {
    return NextResponse.json(
      { message: 'record_type must be either "individual" or "influencer"' },
      { status: 400 }
    );
  }

  const values = await listDistinctFieldValues(field, recordType ?? undefined);

  return NextResponse.json({ data: values });
}
