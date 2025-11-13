import { NextRequest, NextResponse } from "next/server";

import { deleteRecord } from "@/lib/data-store";
import { normalizeID } from "@/app/api/utils/normalize-id";

type RouteParams = { params: Promise<{ id: string }> };

export async function deleteInfluencer(
    _request: NextRequest,
    context: RouteParams
) {
    const { id } = await context.params;
    const recordId = normalizeID(id, "influencer");

    const removed = await deleteRecord("influencer", recordId);
    if (!removed) {
        return NextResponse.json({ message: "Record not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Deleted successfully" });
}
