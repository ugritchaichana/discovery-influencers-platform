export type RecordType = "individual" | "influencer";

export interface PersonRecord {
        recordId: string;
        recordType: RecordType;
        fullName: string;
        preferredName?: string | null;
        gender?: string | null;
        birthDate?: string | null;
        email?: string | null;
        phone?: string | null;
        city?: string | null;
        country?: string | null;
        occupation?: string | null;
        influencerCategory?: string | null;
        primaryPlatform?: string | null;
        followersCount?: number | null;
        totalFollowersCount?: number | null;
        engagementRate?: number | null;
        engagementRateTier?: string | null;
        interests?: string | null;
        notes?: string | null;
        secondaryPlatform?: string | null;
        secondaryFollowersCount?: number | null;
        averageMonthlyReach?: number | null;
        collaborationStatus?: string | null;
        languages?: string | null;
        portfolioUrl?: string | null;
        lastContactDate?: string | null;
}

export type InfluencerRecord = PersonRecord & {
        recordType: "influencer";
};

export type SupporterRecord = PersonRecord & {
        recordType: "individual";
};
