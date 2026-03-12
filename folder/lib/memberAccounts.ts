import { randomUUID, scrypt as nodeScrypt, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

import { getRegionForCounty, type MemberProfile } from "@/app/components/memberData";

const scrypt = promisify(nodeScrypt);
const dataDirectory = path.join(process.cwd(), "data");
const accountsPath = path.join(dataDirectory, "memberAccounts.json");

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

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
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
  const accounts = await readAccounts();
  return accounts.find((account) => account.email === normalizedEmail);
}

export async function createCredentialsAccount({
  email,
  fullName,
  password,
}: CreateCredentialsAccountInput) {
  const normalizedEmail = normalizeEmail(email);
  const accounts = await readAccounts();

  if (accounts.some((account) => account.email === normalizedEmail)) {
    throw new Error("An account with that email already exists.");
  }

  const now = new Date().toISOString();
  const account: MemberAccountRecord = {
    id: randomUUID(),
    email: normalizedEmail,
    fullName: fullName.trim(),
    passwordHash: await hashPassword(password),
    providers: ["credentials"],
    role: normalizedEmail === "bphesq@gmail.com" ? "admin" : "member",
    profile: normalizeProfile({
      email: normalizedEmail,
      fullName: fullName.trim(),
    }),
    createdAt: now,
    updatedAt: now,
  };

  await writeAccounts([...accounts, account]);
  return account;
}

export async function ensureOAuthAccount({
  email,
  fullName,
  provider,
}: EnsureOAuthAccountInput) {
  const normalizedEmail = normalizeEmail(email);
  const accounts = await readAccounts();
  const existing = accounts.find((account) => account.email === normalizedEmail);
  const now = new Date().toISOString();

  if (!existing) {
    const account: MemberAccountRecord = {
      id: randomUUID(),
      email: normalizedEmail,
      fullName: fullName?.trim() || normalizedEmail,
      providers: [provider],
      role: normalizedEmail === "bphesq@gmail.com" ? "admin" : "member",
      profile: normalizeProfile({
        email: normalizedEmail,
        fullName: fullName?.trim() || normalizedEmail,
      }),
      createdAt: now,
      updatedAt: now,
    };

    await writeAccounts([...accounts, account]);
    return account;
  }

  const nextAccount: MemberAccountRecord = {
    ...existing,
    fullName: fullName?.trim() || existing.fullName,
    providers: existing.providers.includes(provider)
      ? existing.providers
      : [...existing.providers, provider],
    profile: normalizeProfile({
      ...existing.profile,
      fullName: fullName?.trim() || existing.profile.fullName || existing.fullName,
      email: normalizedEmail,
    }),
    updatedAt: now,
  };

  await writeAccounts(
    accounts.map((account) => (account.email === normalizedEmail ? nextAccount : account))
  );
  return nextAccount;
}

export async function updateMemberProfile(email: string, profile: MemberProfile) {
  const normalizedEmail = normalizeEmail(email);
  const accounts = await readAccounts();
  const existing = accounts.find((account) => account.email === normalizedEmail);

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

  await writeAccounts(
    accounts.map((account) => (account.email === normalizedEmail ? nextAccount : account))
  );

  return nextAccount.profile;
}

export async function readMemberProfile(email: string) {
  const account = await findAccountByEmail(email);
  return account?.profile;
}

export async function listMemberAccounts() {
  return readAccounts();
}

export async function updateMemberRole(email: string, role: MemberRole) {
  const normalizedEmail = normalizeEmail(email);
  const accounts = await readAccounts();
  const existing = accounts.find((account) => account.email === normalizedEmail);

  if (!existing) {
    throw new Error("Member account not found.");
  }

  const nextAccount: MemberAccountRecord = {
    ...existing,
    role,
    updatedAt: new Date().toISOString(),
  };

  await writeAccounts(
    accounts.map((account) => (account.email === normalizedEmail ? nextAccount : account))
  );

  return nextAccount;
}

export async function isAdminEmail(email?: string | null) {
  if (!email) {
    return false;
  }

  const account = await findAccountByEmail(email);
  return account?.role === "admin";
}
