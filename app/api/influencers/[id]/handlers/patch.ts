import { NextRequest, NextResponse } from "next/server";

import { updateRecord } from "@/lib/data-store";
import { InfluencerRecord } from "@/lib/types";
import { normalizeID } from "@/app/api/utils/normalize-id";

type RouteParams = { params: Promise<{ id: string }> };

export async function updateInfluencer(
    request: NextRequest,
    context: RouteParams
) {
    try {
        const body = (await request.json()) as Partial<InfluencerRecord>;
        const { recordType: _ignoredType, recordId: _ignoredId, ...rest } = body;
        void _ignoredType;
        void _ignoredId;

        const { id } = await context.params;
        const recordId = normalizeID(id, "influencer");

        const record = await updateRecord(
            "influencer",
            recordId,
            rest as Partial<Omit<InfluencerRecord, "recordType" | "recordId">>
        );

        if (!record) {
            return NextResponse.json({ message: "Record not found" }, { status: 404 });
        }

        return NextResponse.json(record);
    } catch {
        return NextResponse.json(
            { message: "Unable to update record" },
            { status: 500 }
        );
    }
}
