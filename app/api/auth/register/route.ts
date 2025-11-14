import { NextRequest, NextResponse } from "next/server";

import { createRecord } from "@/lib/data-store";
import { createAccount } from "@/lib/auth/account-service";
import { createAuthToken, setAuthCookie } from "@/lib/auth/session";
import { toPersonResponse } from "@/app/api/utils/serialize-person-record";
import { parseRecordTypeInput } from "@/app/api/users/handlers/utils";

const REQUIRED_TEXT_FIELDS = [
  "full_name",
  "preferred_name",
  "gender",
  "birth_date",
  "email",
  "phone",
  "country",
  "city",
  "occupation",
  "record_type",
] as const;

const SUPPORTED_COUNTRIES = ["Thailand", "United State", "China"];
const SUPPORTED_GENDERS = ["Male", "Female", "Other"];
const SUPPORTED_LANGUAGES = new Set(["TH", "EN", "CN"]);

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>;

    const missing = REQUIRED_TEXT_FIELDS.filter((field) => !getStringValue(body, [field, camelCase(field)]));
    if (missing.length > 0) {
      return NextResponse.json({ message: `${missing[0]} is required` }, { status: 400 });
    }

    const recordTypeInput = getStringValue(body, ["record_type", "recordType"]);
    const recordType = parseRecordTypeInput(recordTypeInput);
    if (!recordType) {
      return NextResponse.json(
        { message: 'record_type must be either "individual" or "influencer"' },
        { status: 400 }
      );
    }

    const password = getStringValue(body, ["password"]);
    const confirmPassword = getStringValue(body, ["confirm_password", "confirmPassword"]);

    if (!password || !confirmPassword) {
      return NextResponse.json({ message: "password and confirm_password are required" }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ message: "Password must be at least 8 characters" }, { status: 400 });
    }

    if (password !== confirmPassword) {
      return NextResponse.json({ message: "Passwords do not match" }, { status: 400 });
    }

    const gender = normalizeCapitalized(getStringValue(body, ["gender"]) ?? "");
    if (!SUPPORTED_GENDERS.includes(gender)) {
      return NextResponse.json({ message: "Unsupported gender" }, { status: 400 });
    }

    const country = normalizeCapitalized(getStringValue(body, ["country"]) ?? "");
    if (!SUPPORTED_COUNTRIES.includes(country)) {
      return NextResponse.json({ message: "Unsupported country" }, { status: 400 });
    }

    const languages = getLanguages(body);
    if (languages.length === 0) {
      return NextResponse.json({ message: "languages is required" }, { status: 400 });
    }

    const email = getStringValue(body, ["email"]);
    const phone = getStringValue(body, ["phone"]);
    const city = getStringValue(body, ["city"]);
    const occupation = getStringValue(body, ["occupation"]);
    const fullName = getStringValue(body, ["full_name"]);
    const preferredName = getStringValue(body, ["preferred_name"]);
    const birthDate = getStringValue(body, ["birth_date"]);

    if (!email || !phone || !city || !occupation || !fullName || !preferredName || !birthDate) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    const occupationValue = occupation;
    const cityValue = city;

    const collaborationStatus = getStringValue(body, ["collaboration_status", "collaborationStatus"]);
    const primaryPlatform = getStringValue(body, ["primary_platform", "primaryPlatform"]);
    const secondaryPlatform = getStringValue(body, ["secondary_platform", "secondaryPlatform"]);
    const influencerCategory = getStringValue(body, ["influencer_category", "influencerCategory"]);
    const notes = getStringValue(body, ["notes"]);
    const interests = getStringValue(body, ["interests"]);

    const followersCount = getNumberValue(body, ["followers_count", "followersCount"]);
    const secondaryFollowersCount = getNumberValue(body, ["secondary_followers_count", "secondaryFollowersCount"]);
    let totalFollowersCount = getNumberValue(body, ["total_followers_count", "totalFollowersCount"]);
    const averageMonthlyReach = getNumberValue(body, ["average_monthly_reach", "averageMonthlyReach"]);

    if (typeof followersCount === "number" && typeof secondaryFollowersCount === "number") {
      totalFollowersCount = followersCount + secondaryFollowersCount;
    }

    let engagementRate = getNumberValue(body, ["engagement_rate", "engagementRate"]);
    if (
      engagementRate === undefined &&
      typeof totalFollowersCount === "number" &&
      typeof averageMonthlyReach === "number" &&
      averageMonthlyReach > 0
    ) {
      engagementRate = (totalFollowersCount / averageMonthlyReach) / 4;
    }

    let engagementRateTier = getStringValue(body, ["engagement_rate_tier", "engagementRateTier"]);
    if (!engagementRateTier && typeof engagementRate === "number") {
      if (engagementRate > 0.07) {
        engagementRateTier = "high";
      } else if (engagementRate >= 0.05) {
        engagementRateTier = "medium";
      } else if (engagementRate >= 0) {
        engagementRateTier = "low";
      }
    }

    const today = new Date().toISOString().slice(0, 10);

    const record = await createRecord(recordType, {
      fullName,
      preferredName,
      gender,
      birthDate,
      email,
      phone,
      country,
      city: cityValue,
      occupation: occupationValue,
      languages: languages.join(", "),
      collaborationStatus: collaborationStatus ?? undefined,
      primaryPlatform: primaryPlatform ?? undefined,
      secondaryPlatform: secondaryPlatform ?? undefined,
      influencerCategory: influencerCategory ?? undefined,
      followersCount: followersCount ?? undefined,
      totalFollowersCount: totalFollowersCount ?? undefined,
      engagementRate: engagementRate ?? undefined,
      engagementRateTier: engagementRateTier ?? undefined,
      secondaryFollowersCount: secondaryFollowersCount ?? undefined,
      averageMonthlyReach: averageMonthlyReach ?? undefined,
      notes: notes ?? undefined,
      interests: interests ?? undefined,
      recordId: undefined,
      lastContactDate: today,
    });

    const account = await createAccount({
      email,
      password,
      role: "user",
      personRecordId: record.recordId,
    });

    const token = createAuthToken({
      sub: account.id,
      email: account.email,
      role: account.role,
    });

    const response = NextResponse.json({
      data: {
        account: {
          id: account.id,
          email: account.email,
          role: account.role,
        },
        profile: toPersonResponse(record),
      },
    }, { status: 201 });

    setAuthCookie(response, token);
    return response;
  } catch (error) {
    console.error("Register error", error);
    return NextResponse.json({ message: "Unable to register" }, { status: 500 });
  }
}

function getStringValue(source: Record<string, unknown>, aliases: string[]): string | undefined {
  for (const key of aliases) {
    const value = source[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
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

function camelCase(value: string) {
  return value.replace(/_([a-z])/g, (_, char) => char.toUpperCase());
}

function normalizeCapitalized(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .map((segment) => segment[0]?.toUpperCase() + segment.slice(1).toLowerCase())
    .join(" ");
}

function getLanguages(body: Record<string, unknown>): string[] {
  const raw = body.languages;
  if (Array.isArray(raw)) {
    return raw
      .filter((entry): entry is string => typeof entry === "string")
      .map((entry) => entry.trim().toUpperCase())
      .filter((entry) => SUPPORTED_LANGUAGES.has(entry));
  }
  if (typeof raw === "string") {
    return raw
      .split(",")
      .map((entry) => entry.trim().toUpperCase())
      .filter((entry) => SUPPORTED_LANGUAGES.has(entry));
  }
  return [];
}
