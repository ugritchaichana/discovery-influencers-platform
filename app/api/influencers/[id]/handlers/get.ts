import { NextRequest, NextResponse } from "next/server";

import { getRecord } from "@/lib/data-store";
import { normalizeID } from "@/app/api/utils/normalize-id";

type RouteParams = { params: Promise<{ id: string }> };

export async function getInfluencer(
    _request: NextRequest,
    context: RouteParams
) {
    const { id } = await context.params;
    const recordId = normalizeID(id, "influencer");

    const record = await getRecord("influencer", recordId);
    if (!record) {
        return NextResponse.json({ message: "Record not found" }, { status: 404 });
    }

    return NextResponse.json(record);
}
