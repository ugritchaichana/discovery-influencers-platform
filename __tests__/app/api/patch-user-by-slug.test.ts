import { patchUserBySlug } from '@/app/api/users/[slug]/handlers/patch';
import { updateRecord } from '@/lib/data-store';
import { getCurrentUser } from '@/lib/auth/current-user';
import { canCreateRole } from '@/lib/auth/permissions';
import { inferRecordTypeFromId, parseRecordTypeInput } from '@/app/api/users/handlers/utils';
import { toPersonResponse } from '@/app/api/utils/serialize-person-record';

function jsonResponse(body: unknown, init?: { status?: number }) {
  return {
    status: init?.status ?? 200,
    body,
    async json() {
      return body;
    },
  };
}

jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn(jsonResponse),
  },
}));

jest.mock('@/lib/data-store', () => ({
  updateRecord: jest.fn(),
}));

jest.mock('@/lib/auth/current-user', () => ({
  getCurrentUser: jest.fn(),
}));

jest.mock('@/lib/auth/permissions', () => ({
  canCreateRole: jest.fn(),
}));

jest.mock('@/app/api/users/handlers/utils', () => ({
  inferRecordTypeFromId: jest.fn(),
  parseRecordTypeInput: jest.fn(),
}));

jest.mock('@/app/api/utils/serialize-person-record', () => ({
  toPersonResponse: jest.fn((record: { recordId: string }) => ({ record_id: record.recordId })),
}));

type RequestBody = Record<string, unknown>;

const context = (slug: string) => ({ params: Promise.resolve({ slug }) });

const makeRequest = (body: RequestBody) => ({
  json: jest.fn().mockResolvedValue(body),
  headers: new Headers(),
}) as unknown as Parameters<typeof patchUserBySlug>[0];

describe('patchUserBySlug handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (inferRecordTypeFromId as jest.Mock).mockReturnValue('individual');
    (parseRecordTypeInput as jest.Mock).mockImplementation((value: string) => value as 'individual');
    (getCurrentUser as jest.Mock).mockResolvedValue({ id: 'admin', role: 'admin' });
    (canCreateRole as jest.Mock).mockReturnValue(true);
    (updateRecord as jest.Mock).mockResolvedValue({ recordId: 'IND-001' });
    (toPersonResponse as jest.Mock).mockReturnValue({ record_id: 'IND-001' });
  });

  it('validates slug input', async () => {
    const response = await patchUserBySlug(makeRequest({}), context(''));
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ message: 'slug is required' });
  });

  it('requires valid record id prefix', async () => {
    (inferRecordTypeFromId as jest.Mock).mockReturnValue(null);
    const response = await patchUserBySlug(makeRequest({}), context('foo'));
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ message: expect.stringMatching(/record_id/) });
  });

  it('rejects unauthenticated users', async () => {
    (getCurrentUser as jest.Mock).mockResolvedValue(null);
    const response = await patchUserBySlug(makeRequest({}), context('IND-001'));
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ message: 'Unauthorized' });
  });

  it('handles invalid JSON payloads', async () => {
    const request = {
      json: jest.fn().mockRejectedValue(new Error('bad json')),
      headers: new Headers(),
    } as unknown as Parameters<typeof patchUserBySlug>[0];
    const response = await patchUserBySlug(request, context('IND-001'));
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ message: 'Invalid JSON body' });
  });

  it('ensures role assignment respects permissions', async () => {
    (canCreateRole as jest.Mock).mockReturnValue(false);
    const response = await patchUserBySlug(makeRequest({ role: 'editor' }), context('IND-001'));
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ message: 'Forbidden' });
  });

  it('requires role to be non-null when provided', async () => {
    const response = await patchUserBySlug(makeRequest({ role: null }), context('IND-001'));
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ message: 'role cannot be null' });
  });

  it('updates record with computed totals and serialized response', async () => {
    const body = {
      record_type: 'individual',
      followers_count: 500,
      secondary_followers_count: 300,
      average_monthly_reach: 800,
      role: 'editor',
    };
    const response = await patchUserBySlug(makeRequest(body), context('ind-001'));

    expect(updateRecord).toHaveBeenCalledWith(
      'IND-001',
      expect.objectContaining({
        followersCount: 500,
        secondaryFollowersCount: 300,
        totalFollowersCount: 800,
        engagementRateTier: 'high',
        role: 'editor',
      })
    );

    const [, payload] = (updateRecord as jest.Mock).mock.calls.pop() as [string, Record<string, unknown>];
    expect(payload.engagementRate).toBeCloseTo(0.25);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: { record_id: 'IND-001' } });
  });

  it('returns 404 when updateRecord yields null', async () => {
    (updateRecord as jest.Mock).mockResolvedValueOnce(null);
    const response = await patchUserBySlug(makeRequest({ full_name: 'Missing' }), context('IND-404'));
    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ message: 'Record not found' });
  });
});
