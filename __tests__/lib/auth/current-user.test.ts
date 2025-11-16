import { cookies } from 'next/headers';

import { getCurrentUser, getCurrentUserFromCookies, requireCurrentUser } from '@/lib/auth/current-user';
import { getAccountById } from '@/lib/auth/account-service';
import { getAuthClaims, verifyAuthToken } from '@/lib/auth/session';

jest.mock('next/headers', () => ({
  cookies: jest.fn(),
}));

jest.mock('@/lib/auth/account-service', () => ({
  getAccountById: jest.fn(),
}));

jest.mock('@/lib/auth/session', () => ({
  AUTH_COOKIE_NAME: 'auth_token',
  getAuthClaims: jest.fn(),
  verifyAuthToken: jest.fn(),
}));

const mockAccount = {
  id: 'user-1',
  email: 'user@example.com',
  role: 'admin',
  personRecordId: 'IND-001',
};

const makeRequest = () => ({ headers: new Headers(), cookies: { get: jest.fn() } }) as any;

describe('current user helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null when no auth claims are present', async () => {
    (getAuthClaims as jest.Mock).mockReturnValue(null);
    const result = await getCurrentUser(makeRequest());
    expect(result).toBeNull();
    expect(getAccountById).not.toHaveBeenCalled();
  });

  it('resolves user information when claims exist', async () => {
    (getAuthClaims as jest.Mock).mockReturnValue({ sub: 'user-1' });
    (getAccountById as jest.Mock).mockResolvedValue(mockAccount);
    const result = await getCurrentUser(makeRequest());
    expect(result).toEqual(mockAccount);
  });

  it('requireCurrentUser throws when user missing', async () => {
    (getAuthClaims as jest.Mock).mockReturnValue({ sub: 'missing' });
    (getAccountById as jest.Mock).mockResolvedValue(null);
    await expect(requireCurrentUser(makeRequest())).rejects.toThrow('Unauthorized');
  });

  it('reads auth token from cookies when available', async () => {
    const store = { get: jest.fn().mockReturnValue({ value: 'token' }) };
    (cookies as jest.Mock).mockResolvedValue(store);
    (verifyAuthToken as jest.Mock).mockReturnValue({ sub: 'user-1' });
    (getAccountById as jest.Mock).mockResolvedValue(mockAccount);
    const result = await getCurrentUserFromCookies();
    expect(store.get).toHaveBeenCalled();
    expect(result).toEqual(mockAccount);
  });

  it('returns null when cookies lack token or verification fails', async () => {
    (cookies as jest.Mock).mockResolvedValue({ get: jest.fn().mockReturnValue(undefined) });
    const missingToken = await getCurrentUserFromCookies();
    expect(missingToken).toBeNull();

    (cookies as jest.Mock).mockResolvedValue({ get: jest.fn().mockReturnValue({ value: 'token' }) });
    (verifyAuthToken as jest.Mock).mockReturnValue(null);
    const invalidToken = await getCurrentUserFromCookies();
    expect(invalidToken).toBeNull();
  });
});
