import { RecordType } from "../../../lib/types";

export type ResolveResult =
    | { success: true; value: RecordType }
    | { success: false; error: string; status: number };

export function resolveRecordType(
    submitted: string | null | undefined,
    expected: RecordType
): ResolveResult {
    if (submitted === undefined || submitted === null) {
        return { success: true, value: expected };
    }

    if (submitted !== expected) {
        return {
        success: false,
        error: `recordType must be "${expected}" for this endpoint`,
        status: 400,
        };
    }

    return { success: true, value: expected };
}
