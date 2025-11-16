import bcrypt from 'bcryptjs';

import {
  createAccount,
  deleteAccount,
  ensureSuperAdminAccount,
  findAccountByEmail,
  hashPassword,
  updateAccount,
} from '@/lib/auth/account-service';
import prisma from '@/lib/prisma';
import { createRecord } from '@/lib/data-store';

jest.mock('bcryptjs', () => ({
  hash: jest.fn(async (value: string) => `hashed:${value}`),
  compare: jest.fn(async (plain: string, hash: string) => hash === `hashed:${plain}`),
}));

jest.mock('@/lib/data-store', () => ({
  createRecord: jest.fn(),
}));

jest.mock('@/lib/prisma', () => {
  const rawPeopleInfluencers = {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    upsert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
  return {
    __esModule: true,
    default: { rawPeopleInfluencers },
  };
});

const raw = prisma.rawPeopleInfluencers as jest.Mocked<typeof prisma.rawPeopleInfluencers>;

describe('account service', () => {
  const originalEnv = { superadmin: process.env.superadmin, password: process.env.password };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.superadmin = 'root@example.com';
    process.env.password = 'sup3r-secret';
  });

  afterAll(() => {
    process.env.superadmin = originalEnv.superadmin;
    process.env.password = originalEnv.password;
  });

  it('hashes and verifies passwords via bcrypt', async () => {
    const hash = await hashPassword('plain');
    expect(hash).toBe('hashed:plain');
    await expect(bcrypt.compare('plain', hash)).resolves.toBe(true);
  });

  it('ensures a super admin account exists', async () => {
    (raw.findFirst as jest.Mock).mockResolvedValueOnce(null);
    (createRecord as jest.Mock).mockResolvedValueOnce({ recordId: 'IND-100' });
    (raw.update as jest.Mock).mockResolvedValueOnce({
      recordId: 'IND-100',
      email: 'root@example.com',
      role: 'superadmin',
    });

    await ensureSuperAdminAccount();

    expect(createRecord).toHaveBeenCalledWith('individual', expect.objectContaining({
      fullName: 'Super Admin',
      email: 'root@example.com',
    }));
    expect(raw.update).toHaveBeenCalledWith({
      where: { recordId: 'IND-100' },
      data: expect.objectContaining({ role: 'superadmin', passwordHash: 'hashed:sup3r-secret' }),
    });
  });

  it('updates existing super admin when password mismatch', async () => {
    (raw.findFirst as jest.Mock).mockResolvedValueOnce({
      recordId: 'IND-200',
      email: 'root@example.com',
      role: 'admin',
      passwordHash: 'hashed:old',
    });
    (raw.update as jest.Mock).mockResolvedValueOnce({
      recordId: 'IND-200',
      email: 'root@example.com',
      role: 'superadmin',
      passwordHash: 'hashed:sup3r-secret',
    });

    await ensureSuperAdminAccount();

    expect(raw.update).toHaveBeenCalledWith({
      where: { recordId: 'IND-200' },
      data: expect.objectContaining({ role: 'superadmin', passwordHash: 'hashed:sup3r-secret' }),
    });
  });

  it('creates account profiles when missing person record id', async () => {
    (raw.findFirst as jest.Mock).mockResolvedValueOnce(null);
    (createRecord as jest.Mock).mockResolvedValueOnce({ recordId: 'IND-300' });
    (raw.update as jest.Mock).mockResolvedValueOnce({
      recordId: 'IND-300',
      email: 'user@example.com',
      role: 'editor',
      passwordHash: 'hashed:secret',
    });

    const account = await createAccount({ email: 'User@example.com', password: 'secret', role: 'editor' });

    expect(createRecord).toHaveBeenCalled();
    expect(account).toMatchObject({ id: 'IND-300', role: 'editor', email: 'user@example.com' });
  });

  it('rejects duplicate emails that belong to other accounts', async () => {
    (raw.findFirst as jest.Mock).mockResolvedValueOnce({ recordId: 'IND-10' });
    await expect(
      createAccount({ email: 'dup@example.com', password: 'secret', role: 'user', personRecordId: 'IND-11' })
    ).rejects.toThrow('Email already registered');
  });

  it('updates account email and password with validation', async () => {
    (raw.findFirst as jest.Mock).mockResolvedValueOnce(null);
    (raw.update as jest.Mock).mockResolvedValueOnce({
      recordId: 'IND-400',
      email: 'new@example.com',
      role: 'admin',
      passwordHash: 'hashed:newpass',
    });

    const result = await updateAccount({ id: 'IND-400', email: 'New@example.com', password: 'newpass' });
    expect(result).toMatchObject({ email: 'new@example.com' });
    expect(raw.update).toHaveBeenCalledWith({
      where: { recordId: 'IND-400' },
      data: expect.objectContaining({ email: 'new@example.com', passwordHash: 'hashed:newpass' }),
    });
  });

  it('deleteAccount clears password hash and resets role', async () => {
    await deleteAccount('IND-500');
    expect(raw.update).toHaveBeenCalledWith({
      where: { recordId: 'IND-500' },
      data: { passwordHash: null, role: 'user' },
    });
  });

  it('findAccountByEmail normalizes lookup', async () => {
    (raw.findFirst as jest.Mock).mockResolvedValueOnce({
      recordId: 'IND-600',
      email: 'user@example.com',
      role: 'user',
    });
    const account = await findAccountByEmail('User@Example.com');
    expect(account).toMatchObject({ id: 'IND-600', email: 'user@example.com' });
    expect(raw.findFirst).toHaveBeenCalledWith({ where: { email: 'user@example.com' } });
  });
});
