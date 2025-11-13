import { NextRequest, NextResponse } from "next/server";

import { createRecord } from "@/lib/data-store";
import { toPersonResponse } from "@/app/api/utils/serialize-person-record";
import { parseRecordTypeInput } from "./utils";
type RequiredValues = {
  fullName: string;
  preferredName: string;
  gender: string;
  birthDate: string;
  email: string;
  phone: string;
  country: string;
  city: string;
  occupation: string;
  languages: string;
  collaborationStatus: string;
};

type RequiredFieldSpec = {
  key: keyof RequiredValues;
  aliases: string[];
  errorKey: string;
  allowArray?: boolean;
};

const REQUIRED_FIELDS: RequiredFieldSpec[] = [
  { key: "fullName", aliases: ["full_name", "fullName"], errorKey: "full_name" },
  { key: "preferredName", aliases: ["preferred_name", "preferredName"], errorKey: "preferred_name" },
  { key: "gender", aliases: ["gender"], errorKey: "gender" },
  { key: "birthDate", aliases: ["birth_date", "birthDate"], errorKey: "birth_date" },
  { key: "email", aliases: ["email"], errorKey: "email" },
  { key: "phone", aliases: ["phone"], errorKey: "phone" },
  { key: "country", aliases: ["country"], errorKey: "country" },
  { key: "city", aliases: ["city"], errorKey: "city" },
  { key: "occupation", aliases: ["occupation"], errorKey: "occupation" },
  { key: "languages", aliases: ["languages"], errorKey: "languages", allowArray: true },
  {
    key: "collaborationStatus",
    aliases: ["collaboration_status", "collaborationStatus"],
    errorKey: "collaboration_status",
  },
];

export async function createUser(request: NextRequest) {
  let body: Record<string, unknown>;

  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ message: "Invalid JSON body" }, { status: 400 });
  }

  const recordTypeRaw =
    (body.record_type as string | undefined) ?? (body.recordType as string | undefined);
  const recordType = parseRecordTypeInput(recordTypeRaw);

  if (!recordType) {
    return NextResponse.json(
      { message: 'record_type must be either "individual" or "influencer"' },
      { status: 400 }
    );
  }

  const requiredValues = {} as RequiredValues;

  for (const field of REQUIRED_FIELDS) {
    const value = field.allowArray
      ? getStringOrStringArray(body, field.aliases)
      : getStringValue(body, field.aliases);

    if (!value) {
      return NextResponse.json(
        { message: `${field.errorKey} is required` },
        { status: 400 }
      );
    }

    requiredValues[field.key] = value;
  }

  const recordId = getStringValue(body, ["record_id", "recordId"]);
  const primaryPlatform = getStringValue(body, ["primary_platform", "primaryPlatform"]);
  const influencerCategory = getStringValue(body, ["influencer_category", "influencerCategory"]);
  const interests = getStringValue(body, ["interests"]);
  const notes = getStringValue(body, ["notes"]);
  const secondaryPlatform = getStringValue(body, ["secondary_platform", "secondaryPlatform"]);
  const portfolioUrl = getStringValue(body, ["portfolio_url", "portfolioUrl"]);

  const followersCount = getNumberValue(body, ["followers_count", "followersCount"]);
  const secondaryFollowersCount = getNumberValue(body, ["secondary_followers_count", "secondaryFollowersCount"]);
  let totalFollowersCount = getNumberValue(body, ["total_followers_count", "totalFollowersCount"]);
  const averageMonthlyReach = getNumberValue(body, ["average_monthly_reach", "averageMonthlyReach"]);

  if (typeof followersCount === "number" && typeof secondaryFollowersCount === "number") {
    totalFollowersCount = followersCount + secondaryFollowersCount;
  }

  let engagementRate: number | null = null;
  if (
    typeof totalFollowersCount === "number" &&
    typeof averageMonthlyReach === "number" &&
    averageMonthlyReach > 0
  ) {
    engagementRate = (totalFollowersCount / averageMonthlyReach) / 4;
  }

  let engagementRateTier: string | null = null;
  if (typeof engagementRate === "number") {
    if (engagementRate > 0.07) {
      engagementRateTier = "high";
    } else if (engagementRate >= 0.05) {
      engagementRateTier = "medium";
    } else if (engagementRate >= 0) {
      engagementRateTier = "low";
    }
  }

  const today = new Date().toISOString().slice(0, 10);

  try {
    const record = await createRecord(recordType, {
      recordId: recordId ?? undefined,
      fullName: requiredValues.fullName,
      preferredName: requiredValues.preferredName,
      gender: requiredValues.gender,
      birthDate: requiredValues.birthDate,
      email: requiredValues.email,
      phone: requiredValues.phone,
      country: requiredValues.country,
      city: requiredValues.city,
      occupation: requiredValues.occupation,
      languages: requiredValues.languages,
      primaryPlatform: primaryPlatform ?? undefined,
      influencerCategory: influencerCategory ?? undefined,
      followersCount: followersCount ?? undefined,
      totalFollowersCount: totalFollowersCount ?? undefined,
      engagementRate: engagementRate,
      engagementRateTier: engagementRateTier ?? undefined,
      interests: interests ?? undefined,
      notes: notes ?? undefined,
      secondaryPlatform: secondaryPlatform ?? undefined,
      secondaryFollowersCount: secondaryFollowersCount ?? undefined,
      averageMonthlyReach: averageMonthlyReach ?? undefined,
      portfolioUrl: portfolioUrl ?? undefined,
      collaborationStatus: requiredValues.collaborationStatus,
      lastContactDate: today,
    });

    return NextResponse.json({ data: toPersonResponse(record) }, { status: 201 });
  } catch {
    return NextResponse.json(
      { message: "Unable to save record" },
      { status: 500 }
    );
  }
}

function getStringValue(source: Record<string, unknown>, aliases: string[]): string | undefined {
  for (const key of aliases) {
    const value = source[key];
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed.length > 0) {
        return trimmed;
      }
    }
  }
  return undefined;
}

function getStringOrStringArray(source: Record<string, unknown>, aliases: string[]): string | undefined {
  for (const key of aliases) {
    const value = source[key];
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed.length > 0) {
        return trimmed;
      }
    }
    if (Array.isArray(value)) {
      const parts = value
        .filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0)
        .map((entry) => entry.trim());
      if (parts.length > 0) {
        return parts.join(", ");
      }
    }
  }
  return undefined;
}

function getNumberValue(source: Record<string, unknown>, aliases: string[]): number | undefined {
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
  }
  return undefined;
}
