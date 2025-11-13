import { RecordType } from "@/lib/types";

export type RecordFilters = {
  city?: string;
  category?: string;
  engagementTier?: string;
  status?: string;
  followersMin?: number;
  followersMax?: number;
};

export function parseRecordTypeInput(value: string | null | undefined): RecordType | null {
  if (!value) return null;
  const normalized = value.toLowerCase();
  if (normalized === "individual" || normalized === "influencer") {
    return normalized;
  }
  return null;
}

export function inferRecordTypeFromId(value: string | null | undefined): RecordType | null {
  if (!value) return null;
  const upper = value.trim().toUpperCase();
  if (upper.startsWith("INF")) {
    return "influencer";
  }
  if (upper.startsWith("IND")) {
    return "individual";
  }
  return null;
}

export function buildFiltersFromSearchParams(
  recordType: RecordType,
  searchParams: URLSearchParams
): RecordFilters {
  const filters: RecordFilters = {};
  const city = searchParams.get("city");
  if (city) {
    filters.city = city;
  }

  if (recordType === "influencer") {
    const category =
      searchParams.get("influencer_category") ??
      searchParams.get("influencerCategory");
    if (category) {
      filters.category = category;
    }

    const engagementTier =
      searchParams.get("engagement_rate_tier") ??
      searchParams.get("engagementRateTier");
    if (engagementTier) {
      filters.engagementTier = engagementTier;
    }

    const status =
      searchParams.get("collaboration_status") ??
      searchParams.get("collaborationStatus");
    if (status) {
      filters.status = status;
    }
  } else {
    const status = searchParams.get("status");
    if (status) {
      filters.status = status;
    }

    const followersMin = parseNumber(
      searchParams.get("followers_min") ?? searchParams.get("followersMin")
    );
    if (typeof followersMin === "number") {
      filters.followersMin = followersMin;
    }

    const followersMax = parseNumber(
      searchParams.get("followers_max") ?? searchParams.get("followersMax")
    );
    if (typeof followersMax === "number") {
      filters.followersMax = followersMax;
    }
  }

  return filters;
}

function parseNumber(value: string | null): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}
