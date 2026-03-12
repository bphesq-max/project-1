import { randomUUID, scrypt as nodeScrypt, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import postgres from "postgres";

import { getRegionForCounty, type MemberProfile } from "@/app/components/memberData";

const scrypt = promisify(nodeScrypt);
const dataDirectory = path.join(process.cwd(), "data");
const accountsPath = path.join(dataDirectory, "memberAccounts.json");
const databaseUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;
const bootstrapAdminEmails = new Set(["bphesq@gmail.com", "bphesq@icloud.com"]);

export type MemberAccountProvider = "credentials" | "google";
export type MemberRole = "member" | "admin";

export type MemberAccountRecord = {
  id: string;
  email: string;
  fullName: string;
  passwordHash?: string;
  providers: MemberAccountProvider[];
  role: MemberRole;
  profile: MemberProfile;
  createdAt: string;
  updatedAt: string;
};

type CreateCredentialsAccountInput = {
  email: string;
  fullName: string;
  password: string;
};

type EnsureOAuthAccountInput = {
  email: string;
  fullName?: string | null;
  provider: MemberAccountProvider;
};

type MemberAccountRow = {
  id: string;
  email: string;
  full_name: string;
  password_hash: string | null;
  providers: MemberAccountProvider[] | string;
  role: MemberRole;
  profile: MemberProfile | string | null;
  created_at: Date | string;
  updated_at: Date | string;
};

declare global {
  var __memberAccountsSql: ReturnType<typeof postgres> | undefined;
  var __memberAccountsTableReady: Promise<void> | undefined;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function getBootstrapRole(email: string): MemberRole {
  return bootstrapAdminEmails.has(email) ? "admin" : "member";
}

function normalizeProfile(profile: MemberProfile): MemberProfile {
  return {
    ...profile,
    email: profile.email?.trim() || undefined,
    fullName: profile.fullName?.trim() || undefined,
    streetAddress: profile.streetAddress?.trim() || undefined,
    zipCode: profile.zipCode?.trim() || undefined,
    city: profile.city?.trim() || undefined,
    county: profile.county?.trim() || undefined,
    notes: profile.notes?.trim() || undefined,
    region: getRegionForCounty(profile.county),
  };
}

async function ensureAccountsFile() {
  await mkdir(dataDirectory, { recursive: true });

  try {
    await readFile(accountsPath, "utf8");
  } catch {
    await writeFile(accountsPath, "[]\n", "utf8");
  }
}

async function readAccounts() {
  await ensureAccountsFile();

  try {
    const raw = await readFile(accountsPath, "utf8");
    return JSON.parse(raw) as MemberAccountRecord[];
  } catch {
    await writeFile(accountsPath, "[]\n", "utf8");
    return [];
  }
}

async function writeAccounts(accounts: MemberAccountRecord[]) {
  await ensureAccountsFile();
  await writeFile(accountsPath, `${JSON.stringify(accounts, null, 2)}\n`, "utf8");
}

async function hashPassword(password: string) {
  const salt = randomUUID();
  const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt}:${derivedKey.toString("hex")}`;
}

function shouldUseDatabase() {
  return Boolean(databaseUrl);
}

function getSql() {
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not configured.");
  }

  if (!globalThis.__memberAccountsSql) {
    globalThis.__memberAccountsSql = postgres(databaseUrl, {
      ssl: "require",
      max: 1,
      prepare: false,
    });
  }

  return globalThis.__memberAccountsSql;
}

async function ensureAccountsTable() {
  if (!shouldUseDatabase()) {
    return;
  }

  if (!globalThis.__memberAccountsTableReady) {
    const sql = getSql();
    globalThis.__memberAccountsTableReady = sql`
      create table if not exists member_accounts (
        id text primary key,
        email text not null unique,
        full_name text not null,
        password_hash text,
        providers jsonb not null default '[]'::jsonb,
        role text not null default 'member',
        profile jsonb not null default '{}'::jsonb,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      )
    `.then(() => undefined);
  }

  await globalThis.__memberAccountsTableReady;
}

function parseJsonField<T>(value: T | string | null | undefined, fallback: T) {
  if (value == null) {
    return fallback;
  }

  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }

  return value;
}

function mapRowToAccount(row: MemberAccountRow): MemberAccountRecord {
  const providers = parseJsonField<MemberAccountProvider[]>(row.providers, []);
  const profile = normalizeProfile(
    parseJsonField<MemberProfile>(row.profile, {
      email: row.email,
      fullName: row.full_name,
    })
  );

  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    passwordHash: row.password_hash || undefined,
    providers,
    role: bootstrapAdminEmails.has(row.email) ? "admin" : row.role,
    profile,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

async function readAccountsFromDatabase() {
  await ensureAccountsTable();
  const sql = getSql();
  const rows = await sql<MemberAccountRow[]>`
    select
      id,
      email,
      full_name,
      password_hash,
      providers,
      role,
      profile,
      created_at,
      updated_at
    from member_accounts
    order by created_at asc
  `;

  return rows.map(mapRowToAccount);
}

async function findAccountByEmailInDatabase(email: string) {
  await ensureAccountsTable();
  const sql = getSql();
  const rows = await sql<MemberAccountRow[]>`
    select
      id,
      email,
      full_name,
      password_hash,
      providers,
      role,
      profile,
      created_at,
      updated_at
    from member_accounts
    where email = ${email}
    limit 1
  `;

  return rows[0] ? mapRowToAccount(rows[0]) : undefined;
}

async function insertAccountInDatabase(account: MemberAccountRecord) {
  await ensureAccountsTable();
  const sql = getSql();
  await sql`
    insert into member_accounts (
      id,
      email,
      full_name,
      password_hash,
      providers,
      role,
      profile,
      created_at,
      updated_at
    ) values (
      ${account.id},
      ${account.email},
      ${account.fullName},
      ${account.passwordHash ?? null},
      ${sql.json(account.providers)},
      ${account.role},
      ${sql.json(account.profile)},
      ${account.createdAt},
      ${account.updatedAt}
    )
  `;
}

async function updateAccountInDatabase(account: MemberAccountRecord) {
  await ensureAccountsTable();
  const sql = getSql();
  await sql`
    update member_accounts
    set
      full_name = ${account.fullName},
      password_hash = ${account.passwordHash ?? null},
      providers = ${sql.json(account.providers)},
      role = ${account.role},
      profile = ${sql.json(account.profile)},
      updated_at = ${account.updatedAt}
    where email = ${account.email}
  `;
}

export async function verifyPassword(password: string, passwordHash: string) {
  const [salt, storedHash] = passwordHash.split(":");
  if (!salt || !storedHash) {
    return false;
  }

  const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
  const storedBuffer = Buffer.from(storedHash, "hex");

  if (storedBuffer.length !== derivedKey.length) {
    return false;
  }

  return timingSafeEqual(storedBuffer, derivedKey);
}

export async function findAccountByEmail(email: string) {
  const normalizedEmail = normalizeEmail(email);

  if (shouldUseDatabase()) {
    return findAccountByEmailInDatabase(normalizedEmail);
  }

  const accounts = await readAccounts();
  return accounts.find((account) => account.email === normalizedEmail);
}

export async function createCredentialsAccount({
  email,
  fullName,
  password,
}: CreateCredentialsAccountInput) {
  const normalizedEmail = normalizeEmail(email);

  if (await findAccountByEmail(normalizedEmail)) {
    throw new Error("An account with that email already exists.");
  }

  const now = new Date().toISOString();
  const account: MemberAccountRecord = {
    id: randomUUID(),
    email: normalizedEmail,
    fullName: fullName.trim(),
    passwordHash: await hashPassword(password),
    providers: ["credentials"],
    role: getBootstrapRole(normalizedEmail),
    profile: normalizeProfile({
      email: normalizedEmail,
      fullName: fullName.trim(),
    }),
    createdAt: now,
    updatedAt: now,
  };

  if (shouldUseDatabase()) {
    await insertAccountInDatabase(account);
  } else {
    const accounts = await readAccounts();
    await writeAccounts([...accounts, account]);
  }

  return account;
}

export async function ensureOAuthAccount({
  email,
  fullName,
  provider,
}: EnsureOAuthAccountInput) {
  const normalizedEmail = normalizeEmail(email);
  const existing = await findAccountByEmail(normalizedEmail);
  const now = new Date().toISOString();

  if (!existing) {
    const account: MemberAccountRecord = {
      id: randomUUID(),
      email: normalizedEmail,
      fullName: fullName?.trim() || normalizedEmail,
      providers: [provider],
      role: getBootstrapRole(normalizedEmail),
      profile: normalizeProfile({
        email: normalizedEmail,
        fullName: fullName?.trim() || normalizedEmail,
      }),
      createdAt: now,
      updatedAt: now,
    };

    if (shouldUseDatabase()) {
      await insertAccountInDatabase(account);
    } else {
      const accounts = await readAccounts();
      await writeAccounts([...accounts, account]);
    }

    return account;
  }

  const nextAccount: MemberAccountRecord = {
    ...existing,
    fullName: fullName?.trim() || existing.fullName,
    providers: existing.providers.includes(provider)
      ? existing.providers
      : [...existing.providers, provider],
    role: bootstrapAdminEmails.has(normalizedEmail) ? "admin" : existing.role,
    profile: normalizeProfile({
      ...existing.profile,
      fullName: fullName?.trim() || existing.profile.fullName || existing.fullName,
      email: normalizedEmail,
    }),
    updatedAt: now,
  };

  if (shouldUseDatabase()) {
    await updateAccountInDatabase(nextAccount);
  } else {
    const accounts = await readAccounts();
    await writeAccounts(
      accounts.map((account) => (account.email === normalizedEmail ? nextAccount : account))
    );
  }

  return nextAccount;
}

export async function updateMemberProfile(email: string, profile: MemberProfile) {
  const normalizedEmail = normalizeEmail(email);
  const existing = await findAccountByEmail(normalizedEmail);

  if (!existing) {
    throw new Error("Member account not found.");
  }

  const nextProfile = normalizeProfile({
    ...existing.profile,
    ...profile,
    email: normalizedEmail,
    fullName: profile.fullName?.trim() || existing.fullName,
  });
  const nextAccount: MemberAccountRecord = {
    ...existing,
    fullName: nextProfile.fullName || existing.fullName,
    profile: nextProfile,
    updatedAt: new Date().toISOString(),
  };

  if (shouldUseDatabase()) {
    await updateAccountInDatabase(nextAccount);
  } else {
    const accounts = await readAccounts();
    await writeAccounts(
      accounts.map((account) => (account.email === normalizedEmail ? nextAccount : account))
    );
  }

  return nextAccount.profile;
}

export async function readMemberProfile(email: string) {
  const account = await findAccountByEmail(email);
  return account?.profile;
}

export async function listMemberAccounts() {
  if (shouldUseDatabase()) {
    return readAccountsFromDatabase();
  }

  return readAccounts();
}

export async function updateMemberRole(email: string, role: MemberRole) {
  const normalizedEmail = normalizeEmail(email);
  const existing = await findAccountByEmail(normalizedEmail);

  if (!existing) {
    throw new Error("Member account not found.");
  }

  const nextAccount: MemberAccountRecord = {
    ...existing,
    role: bootstrapAdminEmails.has(normalizedEmail) ? "admin" : role,
    updatedAt: new Date().toISOString(),
  };

  if (shouldUseDatabase()) {
    await updateAccountInDatabase(nextAccount);
  } else {
    const accounts = await readAccounts();
    await writeAccounts(
      accounts.map((account) => (account.email === normalizedEmail ? nextAccount : account))
    );
  }

  return nextAccount;
}

export async function isAdminEmail(email?: string | null) {
  if (!email) {
    return false;
  }

  const account = await findAccountByEmail(email);
  return account?.role === "admin";
}
