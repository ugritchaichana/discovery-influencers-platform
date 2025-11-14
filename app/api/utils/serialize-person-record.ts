import { PersonRecord, RecordType } from "@/lib/types";
import type { Role } from "@/lib/auth/permissions";

export type PersonResponse = {
  record_id: string;
  record_type: RecordType;
  full_name: string;
  preferred_name: string | null;
  gender: string | null;
  birth_date: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  country: string | null;
  occupation: string | null;
  influencer_category: string | null;
  primary_platform: string | null;
  followers_count: number | null;
  total_followers_count: number | null;
  engagement_rate: number | null;
  engagement_rate_tier: string | null;
  interests: string | null;
  notes: string | null;
  secondary_platform: string | null;
  secondary_followers_count: number | null;
  average_monthly_reach: number | null;
  collaboration_status: string | null;
  languages: string | null;
  portfolio_url: string | null;
  last_contact_date: string | null;
  role: Role;
};

export function toPersonResponse(record: PersonRecord): PersonResponse {
  return {
    record_id: record.recordId,
    record_type: record.recordType,
    full_name: record.fullName,
    preferred_name: record.preferredName ?? null,
    gender: record.gender ?? null,
    birth_date: record.birthDate ?? null,
    email: record.email ?? null,
    phone: record.phone ?? null,
    city: record.city ?? null,
    country: record.country ?? null,
    occupation: record.occupation ?? null,
    influencer_category: record.influencerCategory ?? null,
    primary_platform: record.primaryPlatform ?? null,
    followers_count: record.followersCount ?? null,
    total_followers_count: record.totalFollowersCount ?? null,
    engagement_rate: record.engagementRate ?? null,
    engagement_rate_tier: record.engagementRateTier ?? null,
    interests: record.interests ?? null,
    notes: record.notes ?? null,
    secondary_platform: record.secondaryPlatform ?? null,
    secondary_followers_count: record.secondaryFollowersCount ?? null,
    average_monthly_reach: record.averageMonthlyReach ?? null,
    collaboration_status: record.collaborationStatus ?? null,
    languages: record.languages ?? null,
    portfolio_url: record.portfolioUrl ?? null,
    last_contact_date: record.lastContactDate ?? null,
    role: record.role,
  };
}

export function toPersonResponseList(records: PersonRecord[]): PersonResponse[] {
  return records.map(toPersonResponse);
}
