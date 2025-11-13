import { NextRequest, NextResponse } from "next/server";

import { createRecord } from "@/lib/data-store";
import { InfluencerRecord } from "@/lib/types";
import { resolveRecordType } from "@/app/api/utils/resolve-record-type";

export async function createInfluencer(request: NextRequest) {
    try {
        const body = (await request.json()) as Partial<InfluencerRecord>;
        if (!body.fullName) {
            return NextResponse.json(
                { message: "fullName is required" },
                { status: 400 }
            );
        }

        const { recordId, recordType: submittedType, fullName, ...rest } = body;

        const resolvedType = resolveRecordType(submittedType, "influencer");
        if (!resolvedType.success) {
            return NextResponse.json(
                { message: resolvedType.error },
                { status: resolvedType.status }
            );
        }

        const extras = rest as Partial<
            Omit<InfluencerRecord, "recordId" | "recordType" | "fullName">
        >;

        const record = await createRecord(resolvedType.value, {
            ...extras,
            recordId: recordId ?? undefined,
            fullName: fullName!,
        });

        return NextResponse.json(record, { status: 201 });
    } catch {
        return NextResponse.json(
            { message: "Unable to save record" },
            { status: 500 }
        );
    }
}
