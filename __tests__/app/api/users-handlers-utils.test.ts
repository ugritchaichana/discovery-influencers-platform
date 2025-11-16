import {
  buildFiltersFromSearchParams,
  inferRecordTypeFromId,
  parseRecordTypeInput,
} from '@/app/api/users/handlers/utils';

describe('users handler utils', () => {
  it('parses record type input safely', () => {
    expect(parseRecordTypeInput('Individual')).toBe('individual');
    expect(parseRecordTypeInput('influencer')).toBe('influencer');
    expect(parseRecordTypeInput('unknown')).toBeNull();
  });

  it('infers record type from ids', () => {
    expect(inferRecordTypeFromId('INF-001')).toBe('influencer');
    expect(inferRecordTypeFromId('ind-123')).toBe('individual');
    expect(inferRecordTypeFromId('bad')).toBeNull();
  });

  it('builds influencer filters with search params aliases', () => {
    const params = new URLSearchParams({
      city: 'Bangkok',
      influencer_category: 'Beauty',
      engagementRateTier: 'high',
      collaborationStatus: 'open',
    });
    expect(buildFiltersFromSearchParams('influencer', params)).toEqual({
      city: 'Bangkok',
      category: 'Beauty',
      engagementTier: 'high',
      status: 'open',
    });
  });

  it('builds supporter filters with numeric parsing', () => {
    const params = new URLSearchParams({
      city: 'Chiang Mai',
      status: 'active',
      followers_min: '1000',
      followersMax: '5000',
    });
    expect(buildFiltersFromSearchParams('individual', params)).toEqual({
      city: 'Chiang Mai',
      status: 'active',
      followersMin: 1000,
      followersMax: 5000,
    });
  });
});
