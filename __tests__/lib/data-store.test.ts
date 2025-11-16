import {
  createRecord,
  deleteRecord,
  getRecord,
  listDistinctFieldValues,
  listRecords,
  updateRecord,
} from '@/lib/data-store';
import prisma from '@/lib/prisma';

jest.mock('@/lib/prisma', () => {
  const rawPeopleInfluencers = {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
  return {
    __esModule: true,
    default: { rawPeopleInfluencers },
  };
});

const raw = prisma.rawPeopleInfluencers as jest.Mocked<typeof prisma.rawPeopleInfluencers>;

const baseRow = {
  recordId: 'IND-001',
  recordType: 'individual',
  fullName: 'Test User',
  preferredName: null,
  gender: null,
  birthDate: null,
  email: null,
  phone: null,
  city: null,
  country: null,
  occupation: null,
  influencerCategory: null,
  primaryPlatform: null,
  followersCount: null,
  totalFollowersCount: null,
  engagementRate: null,
  engagementRateTier: null,
  interests: null,
  notes: null,
  secondaryPlatform: null,
  secondaryFollowersCount: null,
  averageMonthlyReach: null,
  collaborationStatus: null,
  languages: null,
  portfolioUrl: null,
  lastContactDate: null,
  role: 'user',
};

describe('data store', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lists records with filters and follower range applied', async () => {
    raw.findMany.mockResolvedValueOnce([]);
    await listRecords('individual', { city: 'Bangkok', followersMin: 1000, followersMax: 5000 });
    expect(raw.findMany).toHaveBeenCalled();
    const args = raw.findMany.mock.calls[0][0];
    expect(args.where.city).toEqual({ equals: 'Bangkok', mode: 'insensitive' });
    expect(args.where.AND[0].OR).toHaveLength(2);
  });

  it('returns null when record type mismatch', async () => {
    raw.findUnique.mockResolvedValueOnce({ ...baseRow, recordType: 'influencer' });
    const record = await getRecord('individual', 'IND-1');
    expect(record).toBeNull();
  });

  it('creates records with sequential ids when none provided', async () => {
    raw.findFirst.mockResolvedValueOnce({ recordId: 'IND-009' });
    raw.create.mockResolvedValueOnce({ ...baseRow, recordId: 'IND-010' });
    const record = await createRecord('individual', { fullName: 'Seq User' });
    expect(raw.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ recordId: 'IND-010', fullName: 'Seq User' }),
    });
    expect(record.recordId).toBe('IND-010');
  });

  it('updates existing record and ignores empty payloads', async () => {
    raw.findUnique.mockResolvedValueOnce(baseRow);
    raw.update.mockResolvedValueOnce({ ...baseRow, fullName: 'Updated' });
    const record = await updateRecord('IND-001', { fullName: 'Updated' });
    expect(raw.update).toHaveBeenCalled();
    expect(record?.fullName).toBe('Updated');
  });

  it('returns null when updating missing record', async () => {
    raw.findUnique.mockResolvedValueOnce(null);
    const result = await updateRecord('IND-404', { fullName: 'Missing' });
    expect(result).toBeNull();
  });

  it('deletes records when present', async () => {
    raw.findUnique.mockResolvedValueOnce(baseRow);
    raw.delete.mockResolvedValueOnce({});
    const success = await deleteRecord('IND-001');
    expect(success).toBe(true);
    expect(raw.delete).toHaveBeenCalled();
  });

  it('returns false when deleting missing record', async () => {
    raw.findUnique.mockResolvedValueOnce(null);
    const success = await deleteRecord('IND-404');
    expect(success).toBe(false);
  });

  it('lists distinct field values trimmed and sorted', async () => {
    raw.findMany.mockResolvedValueOnce([
      { city: ' Bangkok ' },
      { city: null },
      { city: 'Chiang Mai' },
    ]);
    const values = await listDistinctFieldValues('city');
    expect(values).toEqual(['Bangkok', 'Chiang Mai']);
  });
});
