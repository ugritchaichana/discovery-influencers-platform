import { NextRequest, NextResponse } from "next/server";

import { listRecords } from "@/lib/data-store";

export async function getInfluencers(request: NextRequest) {
    const { searchParams } = request.nextUrl;
    const city = searchParams.get("city") ?? undefined;
    const category =
        searchParams.get("influencer_category") ??
        searchParams.get("influencerCategory") ??
        undefined;
    const engagementTier =
        searchParams.get("engagement_rate_tier") ??
        searchParams.get("engagementRateTier") ??
        undefined;
    const status =
        searchParams.get("collaboration_status") ??
        searchParams.get("collaborationStatus") ??
        undefined;

    const data = await listRecords("influencer", {
        city,
        category,
        engagementTier,
        status,
    });

    return NextResponse.json({ data });
}
