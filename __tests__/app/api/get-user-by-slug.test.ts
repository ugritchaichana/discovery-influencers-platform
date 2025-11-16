import { getUserBySlug } from '@/app/api/users/[slug]/handlers/get';
import { getRecord, listRecords } from '@/lib/data-store';
import { inferRecordTypeFromId } from '@/app/api/users/handlers/utils';

jest.mock('@/lib/data-store', () => ({
  listRecords: jest.fn(),
  getRecord: jest.fn(),
}));

jest.mock('@/app/api/users/handlers/utils', () => ({
  buildFiltersFromSearchParams: jest.fn().mockReturnValue({}),
  inferRecordTypeFromId: jest.fn(),
}));

jest.mock('@/app/api/utils/serialize-person-record', () => ({
  toPersonResponse: jest.fn((record: { recordId: string }) => ({ record_id: record.recordId })),
  toPersonResponseList: jest.fn((records: Array<{ recordId: string }>) =>
    records.map((record) => ({ record_id: record.recordId }))
  ),
}));

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

const context = (slug: string) => ({ params: Promise.resolve({ slug }) });

const makeRequest = (url = 'http://localhost/api/users/INF') =>
  ({
    nextUrl: new URL(url),
    headers: new Headers(),
  }) as unknown as Parameters<typeof getUserBySlug>[0];

describe('getUserBySlug handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('validates slug presence', async () => {
    const response = await getUserBySlug(makeRequest(), context(''));
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ message: 'slug is required' });
  });

  it('lists records when slug equals type prefix', async () => {
    (listRecords as jest.Mock).mockResolvedValue([{ recordId: 'INF-001' }]);
    const response = await getUserBySlug(makeRequest('http://localhost/api/users/INF?city=Bangkok'), context('INF'));
    expect(listRecords).toHaveBeenCalledWith(
      'influencer',
      expect.any(Object)
    );
    expect(await response.json()).toEqual({ data: [{ record_id: 'INF-001' }] });
  });

  it('rejects ids without valid prefixes', async () => {
    (inferRecordTypeFromId as jest.Mock).mockReturnValueOnce(null);
    const response = await getUserBySlug(makeRequest('http://localhost/api/users/foo'), context('foo'));
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ message: expect.stringMatching(/record_id/) });
  });

  it('returns 404 when record not found', async () => {
    (inferRecordTypeFromId as jest.Mock).mockReturnValueOnce('individual');
    (getRecord as jest.Mock).mockResolvedValueOnce(null);
    const response = await getUserBySlug(makeRequest('http://localhost/api/users/ind-404'), context('ind-404'));
    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ message: 'Record not found' });
  });

  it('returns serialized record when found', async () => {
    (inferRecordTypeFromId as jest.Mock).mockReturnValueOnce('individual');
    (getRecord as jest.Mock).mockResolvedValueOnce({ recordId: 'IND-001' });
    const response = await getUserBySlug(makeRequest('http://localhost/api/users/IND-001'), context('IND-001'));
    expect(getRecord).toHaveBeenCalledWith('individual', 'IND-001');
    expect(await response.json()).toEqual({ data: { record_id: 'IND-001' } });
  });
});
