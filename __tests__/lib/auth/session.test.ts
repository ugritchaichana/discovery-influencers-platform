import type { NextResponse } from 'next/server';

import {
  AUTH_COOKIE_NAME,
  clearAuthCookie,
  createAuthToken,
  getAuthClaims,
  getTokenFromRequest,
  requireAuthClaims,
  setAuthCookie,
  verifyAuthToken,
} from '@/lib/auth/session';

type MockResponse = {
  cookies: {
    set: (options: { name: string; value: string } & Record<string, unknown>) => void;
    get: (name: string) => ({ name: string; value: string } & Record<string, unknown>) | undefined;
  };
};

const createMockResponse = (): MockResponse => {
  const store = new Map<string, { name: string; value: string } & Record<string, unknown>>();
  return {
    cookies: {
      set(options) {
        store.set(options.name, options);
      },
      get(name) {
        return store.get(name);
      },
    },
  };
};

describe('auth session helpers', () => {
  const originalEnv = process.env.AUTH_SECRET;

  beforeEach(() => {
    process.env.AUTH_SECRET = 'test-secret';
  });

  afterAll(() => {
    process.env.AUTH_SECRET = originalEnv;
  });

  it('creates and verifies tokens when AUTH_SECRET is set', () => {
    const token = createAuthToken({ sub: '1', email: 'a@example.com', role: 'admin' });
    const claims = verifyAuthToken(token);
    expect(claims).toMatchObject({ sub: '1', email: 'a@example.com', role: 'admin' });
  });

  it('returns null when verification fails', () => {
    const result = verifyAuthToken('invalid.token');
    expect(result).toBeNull();
  });

  it('throws when creating tokens without AUTH_SECRET', () => {
    process.env.AUTH_SECRET = '';
    expect(() => createAuthToken({ sub: '1', email: 'a@example.com', role: 'user' })).toThrow(
      /AUTH_SECRET/
    );
  });

  it('reads bearer tokens before cookies', () => {
    const headers = new Headers({ authorization: 'Bearer abc' });
    const request = {
      headers,
      cookies: { get: jest.fn().mockReturnValue({ value: 'cookie-token' }) },
    } as unknown as Parameters<typeof getTokenFromRequest>[0];
    expect(getTokenFromRequest(request)).toBe('abc');
  });

  it('falls back to auth cookie when header missing', () => {
    const request = {
      headers: new Headers(),
      cookies: { get: jest.fn().mockReturnValue({ value: 'cookie-token' }) },
    } as unknown as Parameters<typeof getTokenFromRequest>[0];
    expect(getTokenFromRequest(request)).toBe('cookie-token');
  });

  it('sets and clears auth cookies with secure defaults', () => {
    const response = createMockResponse();
    setAuthCookie(response as unknown as NextResponse, 'token');
    expect(response.cookies.get(AUTH_COOKIE_NAME)?.value).toBe('token');

    clearAuthCookie(response as unknown as NextResponse);
    expect(response.cookies.get(AUTH_COOKIE_NAME)?.value).toBe('');
  });

  it('requires auth claims and throws when missing', () => {
    const token = createAuthToken({ sub: '1', email: 'a@example.com', role: 'user' });
    const request = {
      headers: new Headers({ authorization: `Bearer ${token}` }),
      cookies: { get: jest.fn().mockReturnValue(undefined) },
    } as unknown as Parameters<typeof requireAuthClaims>[0];

    expect(requireAuthClaims(request)).toMatchObject({ sub: '1' });

    const unauthRequest = {
      headers: new Headers(),
      cookies: { get: jest.fn().mockReturnValue(undefined) },
    } as unknown as Parameters<typeof requireAuthClaims>[0];
    expect(() => requireAuthClaims(unauthRequest)).toThrow('Unauthorized');
  });

  it('getAuthClaims combines token resolution helpers', () => {
    const token = createAuthToken({ sub: '99', email: 'u@example.com', role: 'editor' });
    const request = {
      headers: new Headers(),
      cookies: { get: jest.fn().mockReturnValue({ value: token }) },
    } as unknown as Parameters<typeof getAuthClaims>[0];
    expect(getAuthClaims(request)).toMatchObject({ sub: '99', role: 'editor' });
  });
});
