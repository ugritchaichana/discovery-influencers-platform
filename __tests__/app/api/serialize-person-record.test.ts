import { toPersonResponse, toPersonResponseList } from '@/app/api/utils/serialize-person-record';
import type { PersonRecord } from '@/lib/types';

describe('serialize person record utils', () => {
  const record: PersonRecord = {
    recordId: 'INF-100',
    recordType: 'influencer',
    fullName: 'Ada Lovelace',
    preferredName: null,
    gender: 'female',
    birthDate: '1990-01-01',
    email: 'ada@example.com',
    phone: null,
    city: 'Bangkok',
    country: 'Thailand',
    occupation: 'Engineer',
    influencerCategory: 'Tech',
    primaryPlatform: 'YouTube',
    followersCount: 1000,
    totalFollowersCount: 1500,
    engagementRate: 0.08,
    engagementRateTier: 'high',
    interests: 'STEM',
    notes: null,
    secondaryPlatform: null,
    secondaryFollowersCount: null,
    averageMonthlyReach: 2000,
    collaborationStatus: 'open',
    languages: 'TH, EN',
    portfolioUrl: 'https://example.com',
    lastContactDate: '2025-01-01',
    role: 'admin',
  };

  it('serializes camelCase fields to snake_case API shape', () => {
    const response = toPersonResponse(record);
    expect(response).toMatchObject({
      record_id: 'INF-100',
      full_name: 'Ada Lovelace',
      influencer_category: 'Tech',
      engagement_rate_tier: 'high',
      role: 'admin',
    });
  });

  it('serializes list of records by reusing single serializer', () => {
    const [first] = toPersonResponseList([record, { ...record, recordId: 'INF-101' }]);
    expect(first.record_id).toBe('INF-100');
  });
});
