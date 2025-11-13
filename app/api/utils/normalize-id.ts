import { RecordType } from "../../../lib/types";

export function normalizeID(rawId: string, fallbackType: RecordType): string {
    const trimmed = rawId.trim().toUpperCase();

    const explicitPrefix = detectPrefix(trimmed);
    const prefix = explicitPrefix ?? (fallbackType === "influencer" ? "INF" : "IND");

    const numericPart = extractNumericPart(trimmed, prefix) ?? trimmed;
    const padded = padNumeric(numericPart);

    return `${prefix}-${padded}`;
}

function detectPrefix(value: string): "INF" | "IND" | null {
    if (value.startsWith("INF")) return "INF";
    if (value.startsWith("IND")) return "IND";
    return null;
}

function extractNumericPart(value: string, prefix: string): string | null {
    const pattern = new RegExp(`^${prefix}[-_]?`, "u");
    if (!pattern.test(value)) {
        return null;
    }

    const withoutPrefix = value.replace(pattern, "");
    return withoutPrefix.replace(/^[^0-9]*/, "");
}

function padNumeric(value: string): string {
    const digits = value.replace(/\D/g, "");
    if (!digits) {
        return "000";
    }
    const width = Math.max(digits.length, 3);
    return digits.padStart(width, "0");
}
