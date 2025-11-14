import { NextRequest, NextResponse } from "next/server";

import { updateRecord } from "@/lib/data-store";
import { toPersonResponse } from "@/app/api/utils/serialize-person-record";
import { inferRecordTypeFromId, parseRecordTypeInput } from "../../handlers/utils";
import { canCreateRole, type Role } from "@/lib/auth/permissions";
import { getCurrentUser } from "@/lib/auth/current-user";

const ROLE_VALUES: Role[] = ["superadmin", "admin", "editor", "user"];

export async function patchUserBySlug(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;
  const normalized = (slug ?? "").trim().toUpperCase();

  if (!normalized) {
    return NextResponse.json({ message: "slug is required" }, { status: 400 });
  }

  if (!inferRecordTypeFromId(normalized)) {
    return NextResponse.json(
      { message: "record_id must start with INF or IND" },
      { status: 400 }
    );
  }

  const currentUser = await getCurrentUser(request);
  if (!currentUser) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ message: "Invalid JSON body" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};

  const recordTypeInput = getStringValue(body, ["record_type", "recordType"]);
  if (recordTypeInput) {
    const normalizedType = parseRecordTypeInput(recordTypeInput);
    if (!normalizedType) {
      return NextResponse.json(
        { message: 'record_type must be either "individual" or "influencer"' },
        { status: 400 }
      );
    }
    updates.recordType = normalizedType;
  }

  assignString(updates, "fullName", body, ["full_name", "fullName"]);
  assignString(updates, "preferredName", body, ["preferred_name", "preferredName"]);
  assignString(updates, "gender", body, ["gender"]);
  assignString(updates, "birthDate", body, ["birth_date", "birthDate"]);
  assignString(updates, "email", body, ["email"]);
  assignString(updates, "phone", body, ["phone"]);
  assignString(updates, "country", body, ["country"]);
  assignString(updates, "city", body, ["city"]);
  assignString(updates, "occupation", body, ["occupation"]);
  assignStringOrArray(updates, "languages", body, ["languages"]);
  assignString(updates, "primaryPlatform", body, ["primary_platform", "primaryPlatform"]);
  assignString(updates, "secondaryPlatform", body, ["secondary_platform", "secondaryPlatform"]);
  assignString(updates, "influencerCategory", body, ["influencer_category", "influencerCategory"]);
  assignString(updates, "interests", body, ["interests"]);
  assignString(updates, "notes", body, ["notes"]);
  assignString(updates, "portfolioUrl", body, ["portfolio_url", "portfolioUrl"]);
  assignString(updates, "collaborationStatus", body, ["collaboration_status", "collaborationStatus"]);

  const roleInput = getStringValue(body, ["role"]);
  if (roleInput === null) {
    return NextResponse.json(
      { message: "role cannot be null" },
      { status: 400 }
    );
  }
  if (roleInput !== undefined) {
    const normalizedRole = roleInput.toLowerCase();
    if (!ROLE_VALUES.includes(normalizedRole as Role)) {
      return NextResponse.json(
        { message: `role must be one of: ${ROLE_VALUES.join(", ")}` },
        { status: 400 }
      );
    }
    if (!canCreateRole(currentUser.role, normalizedRole as Role)) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }
    updates.role = normalizedRole as Role;
  }

  const followersCount = getNumberValue(body, ["followers_count", "followersCount"]);
  if (followersCount !== undefined) {
    updates.followersCount = followersCount;
  }

  const secondaryFollowersCount = getNumberValue(body, [
    "secondary_followers_count",
    "secondaryFollowersCount",
  ]);
  if (secondaryFollowersCount !== undefined) {
    updates.secondaryFollowersCount = secondaryFollowersCount;
  }

  let totalFollowersCount = getNumberValue(body, [
    "total_followers_count",
    "totalFollowersCount",
  ]);

  if (typeof followersCount === "number" && typeof secondaryFollowersCount === "number") {
    totalFollowersCount = followersCount + secondaryFollowersCount;
  }

  if (totalFollowersCount !== undefined) {
    updates.totalFollowersCount = totalFollowersCount;
  }

  const averageMonthlyReach = getNumberValue(body, [
    "average_monthly_reach",
    "averageMonthlyReach",
  ]);
  if (averageMonthlyReach !== undefined) {
    updates.averageMonthlyReach = averageMonthlyReach;
  }

  let engagementRate = getNumberValue(body, ["engagement_rate", "engagementRate"]);

  if (
    typeof totalFollowersCount === "number" &&
    typeof averageMonthlyReach === "number" &&
    averageMonthlyReach > 0
  ) {
    engagementRate = (totalFollowersCount / averageMonthlyReach) / 4;
  }

  if (engagementRate !== undefined) {
    updates.engagementRate = engagementRate;
  }

  let engagementRateTier = getStringValue(body, [
    "engagement_rate_tier",
    "engagementRateTier",
  ]);

  if (typeof engagementRate === "number") {
    if (engagementRate > 0.07) {
      engagementRateTier = "high";
    } else if (engagementRate >= 0.05) {
      engagementRateTier = "medium";
    } else if (engagementRate >= 0) {
      engagementRateTier = "low";
    }
  }

  if (engagementRateTier !== undefined) {
    updates.engagementRateTier = engagementRateTier;
  }

  assignString(updates, "lastContactDate", body, ["last_contact_date", "lastContactDate"]);

  const result = await updateRecord(normalized, updates);
  if (!result) {
    return NextResponse.json({ message: "Record not found" }, { status: 404 });
  }

  return NextResponse.json({ data: toPersonResponse(result) });
}

function assignString(
  target: Record<string, unknown>,
  key: string,
  source: Record<string, unknown>,
  aliases: readonly string[]
) {
  const value = getStringValue(source, aliases);
  if (value !== undefined) {
    target[key] = value;
  }
}

function assignStringOrArray(
  target: Record<string, unknown>,
  key: string,
  source: Record<string, unknown>,
  aliases: readonly string[]
) {
  const value = getStringOrStringArray(source, aliases);
  if (value !== undefined) {
    target[key] = value;
  }
}

function getStringValue(
  source: Record<string, unknown>,
  aliases: readonly string[]
): string | null | undefined {
  for (const key of aliases) {
    const value = source[key];
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed.length > 0) {
        return trimmed;
      }
      return null;
    }
    if (value === null) {
      return null;
    }
  }
  return undefined;
}

function getStringOrStringArray(
  source: Record<string, unknown>,
  aliases: readonly string[]
): string | null | undefined {
  for (const key of aliases) {
    const value = source[key];
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed.length > 0) {
        return trimmed;
      }
      return null;
    }
    if (Array.isArray(value)) {
      const parts = value
        .filter((entry): entry is string => typeof entry === "string")
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0);
      if (parts.length > 0) {
        return parts.join(", ");
      }
      return null;
    }
    if (value === null) {
      return null;
    }
  }
  return undefined;
}

function getNumberValue(
  source: Record<string, unknown>,
  aliases: readonly string[]
): number | null | undefined {
  for (const key of aliases) {
    const value = source[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "string" && value.trim().length > 0) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
    if (value === null) {
      return null;
    }
  }
  return undefined;
}
