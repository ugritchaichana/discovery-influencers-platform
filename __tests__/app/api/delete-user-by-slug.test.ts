import { deleteUserBySlug } from '@/app/api/users/[slug]/handlers/delete';
import { deleteRecord } from '@/lib/data-store';
import { inferRecordTypeFromId } from '@/app/api/users/handlers/utils';

jest.mock('next/server', () => {
  class MockNextResponse {
    status: number;
    body: unknown;

    constructor(body: unknown, init?: { status?: number }) {
      this.body = body;
      this.status = init?.status ?? 200;
    }

    static json(body: unknown, init?: { status?: number }) {
      return {
        status: init?.status ?? 200,
        body,
        async json() {
          return body;
        },
      };
    }
  }

  return {
    NextResponse: MockNextResponse,
  };
});

jest.mock('@/lib/data-store', () => ({
  deleteRecord: jest.fn(),
}));

jest.mock('@/app/api/users/handlers/utils', () => ({
  inferRecordTypeFromId: jest.fn(),
}));

const context = (slug: string) => ({ params: Promise.resolve({ slug }) });

const makeRequest = () => ({ headers: new Headers() }) as unknown as Parameters<typeof deleteUserBySlug>[0];

describe('deleteUserBySlug handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (inferRecordTypeFromId as jest.Mock).mockReturnValue('individual');
    (deleteRecord as jest.Mock).mockResolvedValue(true);
  });

  it('validates slug input', async () => {
    const response = await deleteUserBySlug(makeRequest(), context(''));
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ message: 'slug is required' });
  });

  it('requires ids to start with IND/INF', async () => {
    (inferRecordTypeFromId as jest.Mock).mockReturnValue(null);
    const response = await deleteUserBySlug(makeRequest(), context('foo'));
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ message: expect.stringMatching(/record_id/) });
  });

  it('returns 404 when deleteRecord reports no record', async () => {
    (deleteRecord as jest.Mock).mockResolvedValueOnce(false);
    const response = await deleteUserBySlug(makeRequest(), context('IND-404'));
    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ message: 'Record not found' });
  });

  it('returns 204 on successful deletion', async () => {
    const response = await deleteUserBySlug(makeRequest(), context('IND-001'));
    expect(deleteRecord).toHaveBeenCalledWith('IND-001');
    expect(response.status).toBe(204);
  });
});
