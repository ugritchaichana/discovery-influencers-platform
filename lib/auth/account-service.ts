import bcrypt from "bcryptjs";

import prisma from "../prisma";
import { createRecord } from "../data-store";
import type { Role } from "./permissions";

const SALT_ROUNDS = 10;
const db = prisma as unknown as {
  rawPeopleInfluencers: {
    findUnique: (...args: unknown[]) => Promise<unknown>;
    findFirst: (...args: unknown[]) => Promise<unknown>;
    findMany: (...args: unknown[]) => Promise<unknown[]>;
    create: (...args: unknown[]) => Promise<unknown>;
    upsert: (...args: unknown[]) => Promise<unknown>;
    update: (...args: unknown[]) => Promise<unknown>;
    delete: (...args: unknown[]) => Promise<unknown>;
  };
};

type AccountRecord = {
  recordId: string;
  email: string | null;
  passwordHash: string | null;
  role: string;
};

export type PublicAccount = {
  id: string;
  email: string;
  role: Role;
  personRecordId: string | null;
};

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

function toPublicAccount(account: {
  recordId: string;
  email: string | null;
  role: string;
}): PublicAccount {
  return {
    id: account.recordId,
    email: account.email ?? "",
    role: account.role as Role,
    personRecordId: account.recordId,
  };
}

export async function ensureSuperAdminAccount() {
  const email = process.env.superadmin;
  const password = process.env.password;

  if (!email || !password) {
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();
  const existing = (await db.rawPeopleInfluencers.findFirst({
    where: { email: normalizedEmail },
  })) as AccountRecord | null;
  if (!existing) {
    const passwordHash = await hashPassword(password);
    const newRecord = await createRecord("individual", {
      fullName: "Super Admin",
      email: normalizedEmail,
      country: "Thailand",
      city: "Bangkok",
      occupation: "Administrator",
      recordId: undefined,
    });
    await db.rawPeopleInfluencers.update({
      where: { recordId: newRecord.recordId },
      data: {
        email: normalizedEmail,
        passwordHash,
        role: "superadmin",
      },
    });
    return;
  }

  const updates: Record<string, unknown> = {};

  if (existing.role !== "superadmin") {
    updates.role = "superadmin";
  }

  const passwordValid = existing.passwordHash
    ? await verifyPassword(password, existing.passwordHash)
    : false;
  if (!passwordValid) {
    updates.passwordHash = await hashPassword(password);
  }

  if (Object.keys(updates).length > 0) {
    await db.rawPeopleInfluencers.update({
      where: { recordId: existing.recordId },
      data: updates,
    });
  }
}

export async function findAccountByEmail(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const account = (await db.rawPeopleInfluencers.findFirst({ where: { email: normalizedEmail } })) as
    | AccountRecord
    | null;
  return account ? toPublicAccount(account) : null;
}

export async function findAccountWithSecretByEmail(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const account = (await db.rawPeopleInfluencers.findFirst({ where: { email: normalizedEmail } })) as
    | AccountRecord
    | null;
  return account && account.passwordHash ? account : null;
}

export async function getAccountById(id: string) {
  const account = (await db.rawPeopleInfluencers.findUnique({ where: { recordId: id } })) as
    | AccountRecord
    | null;
  return account ? toPublicAccount(account) : null;
}

export async function listAccounts() {
  const accounts = (await db.rawPeopleInfluencers.findMany({
    where: {
      passwordHash: {
        not: null,
      },
      email: {
        not: null,
      },
    },
    orderBy: { recordId: "asc" },
  })) as AccountRecord[];
  return accounts.map(toPublicAccount);
}

export async function createAccount(params: {
  email: string;
  password: string;
  role: Role;
  personRecordId?: string | null;
}) {
  const { email, password, role, personRecordId } = params;
  const normalizedEmail = email.trim().toLowerCase();
  const existing = (await db.rawPeopleInfluencers.findFirst({ where: { email: normalizedEmail } })) as
    | AccountRecord
    | null;
  if (existing && existing.recordId !== personRecordId) {
    throw new Error("Email already registered");
  }

  let resolvedRecordId = personRecordId ?? null;

  if (!resolvedRecordId) {
    const placeholder = await createAccountProfilePlaceholder(role, normalizedEmail);
    resolvedRecordId = placeholder.recordId;
  } else {
    const profile = (await db.rawPeopleInfluencers.findUnique({ where: { recordId: resolvedRecordId } })) as
      | AccountRecord
      | null;
    if (!profile) {
      throw new Error("person_record_id not found");
    }
  }

  if (!resolvedRecordId) {
    throw new Error("Unable to resolve profile record");
  }

  const passwordHash = await hashPassword(password);

  const account = (await db.rawPeopleInfluencers.update({
    where: { recordId: resolvedRecordId },
    data: {
      email: normalizedEmail,
      passwordHash,
      role,
    },
  })) as AccountRecord;

  return toPublicAccount(account);
}

export async function updateAccount(params: {
  id: string;
  email?: string;
  password?: string;
  role?: Role;
}) {
  const { id, email, password, role } = params;

  const updates: Record<string, unknown> = {};

  if (email !== undefined) {
    const normalizedEmail = email.trim().toLowerCase();
    const existing = await findAccountByEmail(normalizedEmail);
    if (existing && existing.id !== id) {
      throw new Error("Email already in use");
    }
    updates.email = normalizedEmail;
  }

  if (password !== undefined) {
    updates.passwordHash = await hashPassword(password);
  }

  if (role !== undefined) {
    updates.role = role;
  }

  const account = (await db.rawPeopleInfluencers.update({
    where: { recordId: id },
    data: updates,
  })) as AccountRecord;

  return toPublicAccount(account);
}

export async function deleteAccount(id: string) {
  await db.rawPeopleInfluencers.update({
    where: { recordId: id },
    data: {
      passwordHash: null,
      role: "user",
    },
  });
}

async function createAccountProfilePlaceholder(role: Role, email: string) {
  const displayName = email.split("@")[0] ?? "User";
  const record = await createRecord("individual", {
    fullName: displayName || "User",
    email,
    country: "Thailand",
    city: "Bangkok",
    occupation: role.charAt(0).toUpperCase() + role.slice(1),
  });
  return record;
}
