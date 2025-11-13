import { Prisma, RawPeopleInfluencers } from "@prisma/client";

import prisma from "./prisma";
import { PersonRecord, RecordType } from "./types";

type FilterOptions = {
    city?: string;
    category?: string;
    engagementTier?: string;
    status?: string;
    followersMin?: number;
    followersMax?: number;
};

type CreatePayload = Partial<Omit<PersonRecord, "recordType" | "recordId">> & {
    fullName: string;
    recordId?: string;
};

type UpdatePayload = Partial<Omit<PersonRecord, "recordId" | "recordType" | "fullName">> & {
    fullName?: string;
};

export type DistinctField =
    | "influencerCategory"
    | "engagementRateTier"
    | "city"
    | "collaborationStatus";

export async function listRecords(
    type: RecordType,
    filters?: FilterOptions
): Promise<PersonRecord[]> {
    const followerRange = buildFollowersRange(
        filters?.followersMin,
        filters?.followersMax
    );

    const where: Prisma.RawPeopleInfluencersWhereInput = {
        recordType: type,
    };

    if (filters?.city) {
        where.city = { equals: filters.city, mode: "insensitive" };
    }

    if (filters?.category) {
        where.influencerCategory = {
            equals: filters.category,
            mode: "insensitive",
        };
    }

    if (filters?.engagementTier) {
        where.engagementRateTier = {
            equals: filters.engagementTier,
            mode: "insensitive",
        };
    }

    if (filters?.status) {
        where.collaborationStatus = {
            equals: filters.status,
            mode: "insensitive",
        };
    }

    if (followerRange) {
        const orConditions: Prisma.RawPeopleInfluencersWhereInput[] = [
            { followersCount: followerRange },
            { totalFollowersCount: followerRange },
        ];

        const existingAnd: Prisma.RawPeopleInfluencersWhereInput[] = Array.isArray(where.AND)
            ? where.AND
            : where.AND
            ? [where.AND]
            : [];

        where.AND = [...existingAnd, { OR: orConditions }];
    }

    const rows = await prisma.rawPeopleInfluencers.findMany({
        where,
        orderBy: { recordId: "asc" },
    });

    return rows.map(toPersonRecord);
}

export async function getRecord(
        type: RecordType,
        id: string
    ): Promise<PersonRecord | null> {
        const row = await prisma.rawPeopleInfluencers.findUnique({
            where: { recordId: id },
        });

        if (!row || row.recordType !== type) {
            return null;
        }

        return toPersonRecord(row);
    }

export async function createRecord(
    type: RecordType,
    payload: CreatePayload
): Promise<PersonRecord> {
    const recordId = payload.recordId ?? (await generateSequentialId(type));
    const data = prepareCreateData(type, recordId, payload);

    const row = await prisma.rawPeopleInfluencers.create({ data });

    return toPersonRecord(row);
}

export async function updateRecord(
    type: RecordType,
    id: string,
    payload: UpdatePayload
): Promise<PersonRecord | null> {
    const existing = await prisma.rawPeopleInfluencers.findUnique({
        where: { recordId: id },
    });

    if (!existing || existing.recordType !== type) {
        return null;
    }

    const data = prepareUpdateData(payload);

    if (Object.keys(data).length === 0) {
        return toPersonRecord(existing);
    }

    const row = await prisma.rawPeopleInfluencers.update({
        where: { recordId: id },
        data,
    });
    return toPersonRecord(row);
}

export async function deleteRecord(
    type: RecordType,
    id: string
): Promise<boolean> {
    const existing = await prisma.rawPeopleInfluencers.findUnique({
        where: { recordId: id },
    });

    if (!existing || existing.recordType !== type) {
        return false;
    }

    await prisma.rawPeopleInfluencers.delete({ where: { recordId: id } });
    return true;
}

export async function listDistinctFieldValues(
    field: DistinctField,
    recordType?: RecordType
): Promise<string[]> {
    const rows = await prisma.rawPeopleInfluencers.findMany({
        where: recordType ? { recordType } : undefined,
        select: { [field]: true } as Record<string, true>,
        distinct: [field] as Prisma.RawPeopleInfluencersScalarFieldEnum[],
    });

    const typedRows = rows as Array<Record<string, string | null>>;

    return typedRows
        .map((row) => {
            const value = row[field];
            return typeof value === "string" ? value.trim() : null;
        })
        .filter((value): value is string => !!value && value.length > 0)
        .sort((a, b) => a.localeCompare(b));
}

function prepareCreateData(
    type: RecordType,
    recordId: string,
    payload: CreatePayload
): Prisma.RawPeopleInfluencersCreateInput {
    return {
        recordId,
        recordType: type,
        fullName: payload.fullName ?? "Unnamed",
        preferredName: payload.preferredName ?? null,
        gender: payload.gender ?? null,
        birthDate: parseDateInput(payload.birthDate),
        email: payload.email ?? null,
        phone: payload.phone ?? null,
        city: payload.city ?? null,
        country: payload.country ?? null,
        occupation: payload.occupation ?? null,
        influencerCategory: payload.influencerCategory ?? null,
        primaryPlatform: payload.primaryPlatform ?? null,
        followersCount: payload.followersCount ?? null,
        totalFollowersCount: payload.totalFollowersCount ?? null,
        engagementRate: payload.engagementRate ?? null,
        engagementRateTier: payload.engagementRateTier ?? null,
        interests: payload.interests ?? null,
        notes: payload.notes ?? null,
        secondaryPlatform: payload.secondaryPlatform ?? null,
        secondaryFollowersCount: payload.secondaryFollowersCount ?? null,
        averageMonthlyReach: payload.averageMonthlyReach ?? null,
        collaborationStatus: payload.collaborationStatus ?? null,
        languages: payload.languages ?? null,
        portfolioUrl: payload.portfolioUrl ?? null,
        lastContactDate: parseDateInput(payload.lastContactDate),
    };
}

function prepareUpdateData(
    payload: UpdatePayload
): Prisma.RawPeopleInfluencersUpdateInput {
    const data: Prisma.RawPeopleInfluencersUpdateInput = {};

    if (payload.fullName !== undefined) data.fullName = payload.fullName;
    if (payload.preferredName !== undefined) data.preferredName = payload.preferredName;
    if (payload.gender !== undefined) data.gender = payload.gender;
    if (payload.birthDate !== undefined) data.birthDate = payload.birthDate ? parseDateInput(payload.birthDate) : null;
    if (payload.email !== undefined) data.email = payload.email;
    if (payload.phone !== undefined) data.phone = payload.phone;
    if (payload.city !== undefined) data.city = payload.city;
    if (payload.country !== undefined) data.country = payload.country;
    if (payload.occupation !== undefined) data.occupation = payload.occupation;
    if (payload.influencerCategory !== undefined) data.influencerCategory = payload.influencerCategory;
    if (payload.primaryPlatform !== undefined) data.primaryPlatform = payload.primaryPlatform;
    if (payload.followersCount !== undefined) data.followersCount = payload.followersCount;
    if (payload.totalFollowersCount !== undefined) data.totalFollowersCount = payload.totalFollowersCount;
    if (payload.engagementRate !== undefined) data.engagementRate = payload.engagementRate;
    if (payload.engagementRateTier !== undefined) data.engagementRateTier = payload.engagementRateTier;
    if (payload.interests !== undefined) data.interests = payload.interests;
    if (payload.notes !== undefined) data.notes = payload.notes;
    if (payload.secondaryPlatform !== undefined) data.secondaryPlatform = payload.secondaryPlatform;
    if (payload.secondaryFollowersCount !== undefined) data.secondaryFollowersCount = payload.secondaryFollowersCount;
    if (payload.averageMonthlyReach !== undefined) data.averageMonthlyReach = payload.averageMonthlyReach;
    if (payload.collaborationStatus !== undefined) data.collaborationStatus = payload.collaborationStatus;
    if (payload.languages !== undefined) data.languages = payload.languages;
    if (payload.portfolioUrl !== undefined) data.portfolioUrl = payload.portfolioUrl;
    if (payload.lastContactDate !== undefined) data.lastContactDate = payload.lastContactDate ? parseDateInput(payload.lastContactDate) : null;

    return data;
}

function toPersonRecord(row: RawPeopleInfluencers): PersonRecord {
    return {
        recordId: row.recordId,
        recordType: row.recordType as RecordType,
        fullName: row.fullName ?? "",
        preferredName: row.preferredName ?? null,
        gender: row.gender ?? null,
        birthDate: formatDate(row.birthDate),
        email: row.email ?? null,
        phone: row.phone ?? null,
        city: row.city ?? null,
        country: row.country ?? null,
        occupation: row.occupation ?? null,
        influencerCategory: row.influencerCategory ?? null,
        primaryPlatform: row.primaryPlatform ?? null,
        followersCount: row.followersCount ?? null,
        totalFollowersCount: row.totalFollowersCount ?? null,
        engagementRate: row.engagementRate ? row.engagementRate.toNumber() : null,
        engagementRateTier: row.engagementRateTier ?? null,
        interests: row.interests ?? null,
        notes: row.notes ?? null,
        secondaryPlatform: row.secondaryPlatform ?? null,
        secondaryFollowersCount: row.secondaryFollowersCount ?? null,
        averageMonthlyReach: row.averageMonthlyReach ?? null,
        collaborationStatus: row.collaborationStatus ?? null,
        languages: row.languages ?? null,
        portfolioUrl: row.portfolioUrl ?? null,
        lastContactDate: formatDate(row.lastContactDate),
    };
}

function buildFollowersRange(
    min?: number, max?: number
): Prisma.IntNullableFilter | undefined {
    const hasMin = typeof min === "number";
    const hasMax = typeof max === "number";

    if (!hasMin && !hasMax) {
        return undefined;
    }

    const filter: Prisma.IntNullableFilter = {};
    if (hasMin) filter.gte = min;
    if (hasMax) filter.lte = max;

    return filter;
}

function parseDateInput(value?: string | null): Date | null {
    if (!value) return null
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDate(value: Date | null): string | null {
    if (!value) return null
    return value.toISOString().slice(0, 10);
}

async function generateSequentialId(type: RecordType): Promise<string> {
    const prefix = type === "individual" ? "IND" : "INF";

    const latest = await prisma.rawPeopleInfluencers.findFirst({
    where: {
        recordType: type,
        recordId: { startsWith: `${prefix}-` },
    },
        orderBy: { recordId: "desc" },
        select: { recordId: true },
    });

    const parsed = parseSequentialId(latest?.recordId, prefix);
    const nextNumber = (parsed?.number ?? 0) + 1;
    const width = parsed?.width ?? 3;

    return `${prefix}-${nextNumber.toString().padStart(width, "0")}`;
}

function parseSequentialId(
    recordId: string | null | undefined,
    expectedPrefix: string
): { number: number; width: number } | null {
    if (!recordId || !recordId.startsWith(`${expectedPrefix}-`)) {
        return null;
    }

    const numericPart = recordId.slice(expectedPrefix.length + 1);
    if (!/^\d+$/.test(numericPart)) {
        return null;
    }

    return {
        number: Number(numericPart),
        width: numericPart.length,
    };
}
