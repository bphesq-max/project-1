import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";

import { CALIFORNIA_COUNTIES, getRegionForCounty } from "@/app/components/memberData";
import { type CandidateEntry } from "@/app/components/candidateData";
import { listPortalContent } from "@/lib/portalContent";
import { readMemberProfile } from "@/lib/memberAccounts";

const databaseUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;
const googleCivicApiKey = process.env.GOOGLE_CIVIC_API_KEY;
const dataDirectory = path.join(process.cwd(), "data");
const ballotPath = path.join(dataDirectory, "ballotData.json");
const activeElectionProviderId = "ca-current-ballot-profile";

export type BallotAddressInput = {
  street1: string;
  street2?: string;
  city: string;
  state?: string;
  zipCode: string;
  county: string;
};

export type BallotAddressRecord = {
  id: string;
  memberEmail: string;
  street1: string;
  street2?: string;
  city: string;
  state: "CA";
  zipCode: string;
  county: string;
  region?: string;
  normalizedAddress: string;
  lookupProvider: string;
  lookupStatus: string;
  createdAt: string;
  updatedAt: string;
};

export type BallotElectionRecord = {
  id: string;
  providerElectionId: string;
  name: string;
  electionDate?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type BallotContestRecord = {
  id: string;
  ballotId: string;
  contestKey: string;
  contestType: "candidate" | "measure";
  officeName?: string;
  districtName?: string;
  districtNumber?: string;
  ballotTitle: string;
  sortOrder: number;
  contestJson: Record<string, unknown>;
  createdAt: string;
};

export type BallotContestMatchRecord = {
  id: string;
  contestId: string;
  candidateContentId: string;
  matchConfidence: number;
  reviewStatus: "auto" | "reviewed";
  reviewedBy?: string;
  reviewedAt?: string;
};

export type BallotSnapshotRecord = {
  id: string;
  memberEmail: string;
  electionId: string;
  addressId: string;
  county: string;
  region?: string;
  divisionOcdId?: string;
  pollingLocations: Array<Record<string, unknown>>;
  earlyVotingSites: Array<Record<string, unknown>>;
  dropBoxes: Array<Record<string, unknown>>;
  coverageNote?: string;
  generatedAt: string;
  updatedAt: string;
};

export type BallotMatchedCandidate = {
  id: string;
  title: string;
  href: string;
};

export type BallotContestView = {
  id: string;
  contestKey: string;
  contestType: "candidate" | "measure";
  officeName?: string;
  districtName?: string;
  districtNumber?: string;
  ballotTitle: string;
  sortOrder: number;
  matchedCandidates: BallotMatchedCandidate[];
  officialCandidateNames?: string[];
};

export type BallotPreview = {
  election: BallotElectionRecord;
  address: BallotAddressRecord;
  contests: BallotContestView[];
  pollingLocations: Array<Record<string, unknown>>;
  earlyVotingSites: Array<Record<string, unknown>>;
  dropBoxes: Array<Record<string, unknown>>;
  lookupMode: "official" | "internal";
  coverageNote: string;
};

export type SavedBallotView = {
  election: BallotElectionRecord;
  address: BallotAddressRecord;
  ballot: BallotSnapshotRecord;
  contests: BallotContestView[];
};

export type BallotAnalyticsOverview = {
  totalSavedAddresses: number;
  totalSavedBallots: number;
  activeElectionName: string;
  byCounty: Array<{ label: string; count: number }>;
  byRegion: Array<{ label: string; count: number }>;
};

type BallotFileShape = {
  addresses: BallotAddressRecord[];
  elections: BallotElectionRecord[];
  ballots: BallotSnapshotRecord[];
  contests: BallotContestRecord[];
  matches: BallotContestMatchRecord[];
};

type AddressRow = {
  id: string;
  member_email: string;
  street_1: string;
  street_2: string | null;
  city: string;
  state: string;
  zip_code: string;
  county: string;
  region: string | null;
  normalized_address: string;
  lookup_provider: string;
  lookup_status: string;
  created_at: Date | string;
  updated_at: Date | string;
};

type ElectionRow = {
  id: string;
  provider_election_id: string;
  name: string;
  election_date: Date | string | null;
  is_active: boolean;
  created_at: Date | string;
  updated_at: Date | string;
};

type BallotRow = {
  id: string;
  member_email: string;
  election_id: string;
  address_id: string;
  county: string;
  region: string | null;
  division_ocd_id: string | null;
  polling_location_json: Array<Record<string, unknown>> | string;
  early_vote_json: Array<Record<string, unknown>> | string;
  drop_box_json: Array<Record<string, unknown>> | string;
  coverage_note: string | null;
  generated_at: Date | string;
  updated_at: Date | string;
};

type ContestRow = {
  id: string;
  ballot_id: string;
  contest_key: string;
  contest_type: "candidate" | "measure";
  office_name: string | null;
  district_name: string | null;
  district_number: string | null;
  ballot_title: string;
  sort_order: number;
  contest_json: Record<string, unknown> | string;
  created_at: Date | string;
};

type MatchRow = {
  id: string;
  contest_id: string;
  candidate_content_id: string;
  match_confidence: string | number;
  review_status: "auto" | "reviewed";
  reviewed_by: string | null;
  reviewed_at: Date | string | null;
};

type ContestSeed = {
  contestKey: string;
  ballotTitle: string;
  contestType: "candidate" | "measure";
  officeName?: string;
  districtName?: string;
  districtNumber?: string;
  sortOrder: number;
  matchedCandidates: CandidateEntry[];
  officialCandidateNames?: string[];
};

declare global {
  var __ballotsSql: ReturnType<typeof postgres> | undefined;
  var __ballotsTablesReady: Promise<void> | undefined;
}

function shouldUseDatabase() {
  return Boolean(databaseUrl);
}

function getSql() {
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not configured.");
  }

  if (!globalThis.__ballotsSql) {
    globalThis.__ballotsSql = postgres(databaseUrl, {
      ssl: "require",
      max: 1,
      prepare: false,
    });
  }

  return globalThis.__ballotsSql;
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

function mapAddressRow(row: AddressRow): BallotAddressRecord {
  return {
    id: row.id,
    memberEmail: row.member_email,
    street1: row.street_1,
    street2: row.street_2 || undefined,
    city: row.city,
    state: "CA",
    zipCode: row.zip_code,
    county: row.county,
    region: row.region || undefined,
    normalizedAddress: row.normalized_address,
    lookupProvider: row.lookup_provider,
    lookupStatus: row.lookup_status,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

function mapElectionRow(row: ElectionRow): BallotElectionRecord {
  return {
    id: row.id,
    providerElectionId: row.provider_election_id,
    name: row.name,
    electionDate: row.election_date
      ? new Date(row.election_date).toISOString().slice(0, 10)
      : undefined,
    isActive: row.is_active,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

function mapBallotRow(row: BallotRow): BallotSnapshotRecord {
  return {
    id: row.id,
    memberEmail: row.member_email,
    electionId: row.election_id,
    addressId: row.address_id,
    county: row.county,
    region: row.region || undefined,
    divisionOcdId: row.division_ocd_id || undefined,
    pollingLocations: parseJsonField(row.polling_location_json, []),
    earlyVotingSites: parseJsonField(row.early_vote_json, []),
    dropBoxes: parseJsonField(row.drop_box_json, []),
    coverageNote: row.coverage_note || undefined,
    generatedAt: new Date(row.generated_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

function mapContestRow(row: ContestRow): BallotContestRecord {
  return {
    id: row.id,
    ballotId: row.ballot_id,
    contestKey: row.contest_key,
    contestType: row.contest_type,
    officeName: row.office_name || undefined,
    districtName: row.district_name || undefined,
    districtNumber: row.district_number || undefined,
    ballotTitle: row.ballot_title,
    sortOrder: row.sort_order,
    contestJson: parseJsonField(row.contest_json, {}),
    createdAt: new Date(row.created_at).toISOString(),
  };
}

function mapMatchRow(row: MatchRow): BallotContestMatchRecord {
  return {
    id: row.id,
    contestId: row.contest_id,
    candidateContentId: row.candidate_content_id,
    matchConfidence: Number(row.match_confidence),
    reviewStatus: row.review_status,
    reviewedBy: row.reviewed_by || undefined,
    reviewedAt: row.reviewed_at ? new Date(row.reviewed_at).toISOString() : undefined,
  };
}

function summarizeCounts(items: string[]) {
  const counts = new Map<string, number>();

  for (const item of items) {
    counts.set(item, (counts.get(item) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label));
}

async function ensureBallotFile() {
  await mkdir(dataDirectory, { recursive: true });

  try {
    await readFile(ballotPath, "utf8");
  } catch {
    await writeFile(
      ballotPath,
      `${JSON.stringify(
        { addresses: [], elections: [], ballots: [], contests: [], matches: [] },
        null,
        2
      )}\n`,
      "utf8"
    );
  }
}

async function readBallotFile() {
  await ensureBallotFile();

  try {
    const raw = await readFile(ballotPath, "utf8");
    return JSON.parse(raw) as BallotFileShape;
  } catch {
    const fallback: BallotFileShape = {
      addresses: [],
      elections: [],
      ballots: [],
      contests: [],
      matches: [],
    };
    await writeFile(ballotPath, `${JSON.stringify(fallback, null, 2)}\n`, "utf8");
    return fallback;
  }
}

async function writeBallotFile(content: BallotFileShape) {
  await ensureBallotFile();
  await writeFile(ballotPath, `${JSON.stringify(content, null, 2)}\n`, "utf8");
}

async function ensureBallotTables() {
  if (!shouldUseDatabase()) {
    return;
  }

  if (!globalThis.__ballotsTablesReady) {
    const sql = getSql();
    globalThis.__ballotsTablesReady = (async () => {
      await sql`
        create table if not exists member_ballot_addresses (
          id text primary key,
          member_email text not null unique,
          street_1 text not null,
          street_2 text,
          city text not null,
          state text not null,
          zip_code text not null,
          county text not null,
          region text,
          normalized_address text not null,
          lookup_provider text not null,
          lookup_status text not null,
          created_at timestamptz not null default now(),
          updated_at timestamptz not null default now()
        )
      `;

      await sql`
        create table if not exists elections (
          id text primary key,
          provider_election_id text not null unique,
          name text not null,
          election_date date,
          is_active boolean not null default false,
          created_at timestamptz not null default now(),
          updated_at timestamptz not null default now()
        )
      `;

      await sql`
        create table if not exists member_ballots (
          id text primary key,
          member_email text not null,
          election_id text not null,
          address_id text not null,
          county text not null,
          region text,
          division_ocd_id text,
          polling_location_json jsonb not null default '[]'::jsonb,
          early_vote_json jsonb not null default '[]'::jsonb,
          drop_box_json jsonb not null default '[]'::jsonb,
          coverage_note text,
          generated_at timestamptz not null default now(),
          updated_at timestamptz not null default now(),
          unique (member_email, election_id)
        )
      `;

      await sql`
        create table if not exists ballot_contests (
          id text primary key,
          ballot_id text not null,
          contest_key text not null,
          contest_type text not null,
          office_name text,
          district_name text,
          district_number text,
          ballot_title text not null,
          sort_order integer not null default 0,
          contest_json jsonb not null default '{}'::jsonb,
          created_at timestamptz not null default now()
        )
      `;

      await sql`
        create table if not exists contest_candidate_matches (
          id text primary key,
          contest_id text not null,
          candidate_content_id text not null,
          match_confidence numeric(4,3) not null default 0,
          review_status text not null default 'auto',
          reviewed_by text,
          reviewed_at timestamptz,
          unique (contest_id, candidate_content_id)
        )
      `;
    })().then(() => undefined);
  }

  await globalThis.__ballotsTablesReady;
}

function canonicalCounty(county: string) {
  const normalized = county.trim().toLowerCase();
  return CALIFORNIA_COUNTIES.find((entry) => entry.toLowerCase() === normalized);
}

function normalizeZip(zipCode: string) {
  const digits = zipCode.replace(/\D/g, "").slice(0, 5);
  return digits;
}

function normalizeLabel(value?: string) {
  return (value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function extractDistrictNumber(value?: string) {
  const match = value?.match(/\b(\d+)\b/);
  return match?.[1];
}

function formatLocationAddress(address: Record<string, unknown> | undefined) {
  if (!address) {
    return "";
  }

  const lines = [
    typeof address.line1 === "string" ? address.line1 : "",
    typeof address.line2 === "string" ? address.line2 : "",
    typeof address.line3 === "string" ? address.line3 : "",
  ].filter(Boolean);

  const city = typeof address.city === "string" ? address.city : "";
  const state = typeof address.state === "string" ? address.state : "";
  const zip = typeof address.zip === "string" ? address.zip : "";
  const cityLine = [city, state, zip].filter(Boolean).join(", ").replace(", ,", ",");

  return [...lines, cityLine].filter(Boolean).join(" · ");
}

function mapLocationEntry(entry: Record<string, unknown>) {
  const address =
    typeof entry.address === "object" && entry.address !== null
      ? (entry.address as Record<string, unknown>)
      : undefined;
  const name = typeof entry.addressLocationName === "string"
    ? entry.addressLocationName
    : typeof entry.name === "string"
      ? entry.name
      : "Voting location";

  return {
    name,
    address: formatLocationAddress(address),
    notes:
      typeof entry.notes === "string"
        ? entry.notes
        : typeof entry.pollingHours === "string"
          ? entry.pollingHours
          : undefined,
  };
}

function scoreCandidateMatch(candidate: CandidateEntry, contest: ContestSeed) {
  const candidateOffice = normalizeLabel(candidate.title.split(" for ")[1]?.trim() || candidate.title);
  const candidateTitle = normalizeLabel(candidate.title);
  const contestOffice = normalizeLabel(contest.officeName || contest.ballotTitle);
  const contestDistrict = normalizeLabel(contest.districtName || contest.ballotTitle);
  const contestDistrictNumber = contest.districtNumber || extractDistrictNumber(contest.ballotTitle);

  let score = 0;

  if (candidate.category === "Statewide Candidates") {
    if (candidateOffice === contestOffice || candidateTitle.includes(contestOffice)) {
      score += 10;
    }
  }

  for (const label of candidate.districtLabels ?? []) {
    const normalizedLabel = normalizeLabel(label);
    if (contestDistrict && normalizedLabel === contestDistrict) {
      score += 10;
    }

    const districtNumber = extractDistrictNumber(label);
    if (contestDistrictNumber && districtNumber === contestDistrictNumber) {
      score += 6;
    }
  }

  if (
    contestOffice &&
    candidateOffice &&
    (candidateOffice === contestOffice ||
      candidateTitle.includes(contestOffice) ||
      contestOffice.includes(candidateOffice))
  ) {
    score += 4;
  }

  return score;
}

function matchCandidatesToContest(candidates: CandidateEntry[], contest: ContestSeed) {
  if (contest.contestType !== "candidate") {
    return [];
  }

  return candidates
    .map((candidate) => ({
      candidate,
      score: scoreCandidateMatch(candidate, contest),
    }))
    .filter((entry) => entry.score >= 8)
    .sort((left, right) => right.score - left.score || left.candidate.title.localeCompare(right.candidate.title))
    .map((entry) => entry.candidate);
}

function buildNormalizedAddress(address: BallotAddressInput) {
  return [address.street1, address.street2, address.city, address.county, "CA", address.zipCode]
    .filter(Boolean)
    .join(", ");
}

function normalizeAddressInput(input: BallotAddressInput): BallotAddressInput {
  const county = canonicalCounty(input.county || "");

  return {
    street1: input.street1.trim(),
    street2: input.street2?.trim() || undefined,
    city: input.city.trim(),
    state: "CA",
    zipCode: normalizeZip(input.zipCode),
    county: county ?? input.county.trim(),
  };
}

function validateCaliforniaAddress(input: BallotAddressInput) {
  if (!input.street1) {
    throw new Error("Street address is required.");
  }

  if (!input.city) {
    throw new Error("City is required.");
  }

  if (!input.zipCode || input.zipCode.length !== 5) {
    throw new Error("Enter a valid California ZIP code.");
  }

  if (!input.county) {
    throw new Error("County is required.");
  }

  if (!canonicalCounty(input.county)) {
    throw new Error("Choose a California county from the list.");
  }
}

function buildDefaultElection(): BallotElectionRecord {
  const now = new Date().toISOString();

  return {
    id: activeElectionProviderId,
    providerElectionId: activeElectionProviderId,
    name: "Current California ballot profile",
    electionDate: undefined,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };
}

async function readActiveElectionFromDatabase() {
  await ensureBallotTables();
  const sql = getSql();
  const activeRows = await sql<ElectionRow[]>`
    select id, provider_election_id, name, election_date, is_active, created_at, updated_at
    from elections
    where is_active = true
    order by updated_at desc
    limit 1
  `;

  if (activeRows[0]) {
    return mapElectionRow(activeRows[0]);
  }

  const fallback = buildDefaultElection();
  await sql`
    insert into elections (id, provider_election_id, name, election_date, is_active, created_at, updated_at)
    values (
      ${fallback.id},
      ${fallback.providerElectionId},
      ${fallback.name},
      ${fallback.electionDate ?? null},
      true,
      ${fallback.createdAt},
      ${fallback.updatedAt}
    )
    on conflict (provider_election_id) do update
    set name = excluded.name,
        is_active = excluded.is_active,
        updated_at = excluded.updated_at
  `;

  return fallback;
}

async function readActiveElectionFromFile() {
  const file = await readBallotFile();
  const existing = file.elections.find((entry) => entry.isActive);

  if (existing) {
    return existing;
  }

  const nextElection = buildDefaultElection();
  await writeBallotFile({
    ...file,
    elections: [...file.elections, nextElection],
  });
  return nextElection;
}

export async function readActiveElection() {
  if (shouldUseDatabase()) {
    return readActiveElectionFromDatabase();
  }

  return readActiveElectionFromFile();
}

function groupCandidatesForBallot(candidates: CandidateEntry[], zipCode: string) {
  const statewideGroups = new Map<string, ContestSeed>();
  const localGroups = new Map<string, ContestSeed>();

  for (const candidate of candidates) {
    if (candidate.category === "Statewide Candidates") {
      const officeName = candidate.title.split(" for ")[1]?.trim() || candidate.title;
      const contestKey = `statewide:${officeName.toLowerCase()}`;
      const ballotTitle = officeName;
      const current = statewideGroups.get(contestKey);

      if (current) {
        current.matchedCandidates.push(candidate);
      } else {
        statewideGroups.set(contestKey, {
          contestKey,
          ballotTitle,
          contestType: "candidate",
          officeName,
          sortOrder: statewideGroups.size,
          matchedCandidates: [candidate],
        });
      }

      continue;
    }

    const zipMatch = candidate.zipCodes?.some((entry) => normalizeZip(entry) === zipCode);
    if (!zipMatch) {
      continue;
    }

    const districtLabel = candidate.districtLabels?.[0] || candidate.title;
    const contestKey = `local:${districtLabel.toLowerCase()}`;
    const current = localGroups.get(contestKey);

    if (current) {
      current.matchedCandidates.push(candidate);
    } else {
      localGroups.set(contestKey, {
        contestKey,
        ballotTitle: districtLabel,
        contestType: "candidate",
        officeName: candidate.title.split(" for ")[1]?.trim() || candidate.title,
        districtName: districtLabel,
        districtNumber: districtLabel.replace(/[^0-9]/g, "") || undefined,
        sortOrder: 100 + localGroups.size,
        matchedCandidates: [candidate],
      });
    }
  }

  return [...statewideGroups.values(), ...localGroups.values()].sort(
    (left, right) => left.sortOrder - right.sortOrder
  );
}

async function fetchOfficialCaliforniaBallot(input: BallotAddressInput) {
  if (!googleCivicApiKey) {
    return null;
  }

  const address = buildNormalizedAddress(input);
  const params = new URLSearchParams({
    address,
    key: googleCivicApiKey,
    officialOnly: "false",
  });

  const response = await fetch(
    `https://www.googleapis.com/civicinfo/v2/voterinfo?${params.toString()}`,
    { cache: "no-store" }
  );

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as Record<string, unknown>;
  return data;
}

async function buildOfficialPreviewForAddress(
  memberEmail: string,
  input: BallotAddressInput
): Promise<BallotPreview | null> {
  const official = await fetchOfficialCaliforniaBallot(input);

  if (!official) {
    return null;
  }

  const candidates = await listPortalContent("candidates");
  const electionData =
    typeof official.election === "object" && official.election !== null
      ? (official.election as Record<string, unknown>)
      : undefined;
  const election: BallotElectionRecord = {
    id:
      typeof electionData?.id === "string"
        ? `google-civic:${electionData.id}`
        : activeElectionProviderId,
    providerElectionId:
      typeof electionData?.id === "string" ? `google-civic:${electionData.id}` : activeElectionProviderId,
    name:
      typeof electionData?.name === "string"
        ? electionData.name
        : "Current California ballot profile",
    electionDate:
      typeof electionData?.electionDay === "string" ? electionData.electionDay : undefined,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const contestsRaw = Array.isArray(official.contests)
    ? (official.contests as Array<Record<string, unknown>>)
    : [];

  const contestSeeds = contestsRaw.map((contest, index) => {
    const district =
      typeof contest.district === "object" && contest.district !== null
        ? (contest.district as Record<string, unknown>)
        : undefined;
    const officeName =
      typeof contest.office === "string"
        ? contest.office
        : typeof contest.referendumTitle === "string"
          ? contest.referendumTitle
          : undefined;
    const ballotTitle = officeName || `Contest ${index + 1}`;
    const districtName =
      typeof district?.name === "string"
        ? district.name
        : typeof contest.name === "string"
          ? contest.name
          : undefined;
    const officialCandidateNames = Array.isArray(contest.candidates)
      ? (contest.candidates as Array<Record<string, unknown>>)
          .map((entry) => (typeof entry.name === "string" ? entry.name : undefined))
          .filter(Boolean) as string[]
      : undefined;
    const contestType = typeof contest.referendumTitle === "string" ? "measure" : "candidate";

    const seed: ContestSeed = {
      contestKey: `official:${normalizeLabel(ballotTitle)}:${extractDistrictNumber(districtName) || index}`,
      ballotTitle,
      contestType,
      officeName,
      districtName,
      districtNumber: extractDistrictNumber(districtName),
      sortOrder: index,
      matchedCandidates: [],
      officialCandidateNames,
    };

    seed.matchedCandidates = matchCandidatesToContest(candidates, seed);
    return seed;
  });

  const normalized = normalizeAddressInput(input);
  const addressRecord: BallotAddressRecord = {
    id: randomUUID(),
    memberEmail,
    street1: normalized.street1,
    street2: normalized.street2,
    city: normalized.city,
    state: "CA",
    zipCode: normalized.zipCode,
    county: normalized.county,
    region: getRegionForCounty(normalized.county),
    normalizedAddress: buildNormalizedAddress(normalized),
    lookupProvider: "google-civic",
    lookupStatus: "official_lookup_ready",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const pollingLocations = Array.isArray(official.pollingLocations)
    ? (official.pollingLocations as Array<Record<string, unknown>>).map(mapLocationEntry)
    : [];
  const earlyVotingSites = Array.isArray(official.earlyVoteSites)
    ? (official.earlyVoteSites as Array<Record<string, unknown>>).map(mapLocationEntry)
    : [];
  const dropBoxes = Array.isArray(official.dropOffLocations)
    ? (official.dropOffLocations as Array<Record<string, unknown>>).map(mapLocationEntry)
    : [];

  return {
    election,
    address: addressRecord,
    contests: contestSeeds.map((contest, index) => ({
      id: `${contest.contestKey}:${index}`,
      contestKey: contest.contestKey,
      contestType: contest.contestType,
      officeName: contest.officeName,
      districtName: contest.districtName,
      districtNumber: contest.districtNumber,
      ballotTitle: contest.ballotTitle,
      sortOrder: contest.sortOrder,
      matchedCandidates: contest.matchedCandidates.map((candidate) => ({
        id: candidate.id,
        title: candidate.title,
        href: `/candidates/${candidate.id}`,
      })),
      officialCandidateNames: contest.officialCandidateNames,
    })),
    pollingLocations,
    earlyVotingSites,
    dropBoxes,
    lookupMode: "official",
    coverageNote:
      "Official ballot, polling place, and voting-site data are connected for this address. Candidate links below are matched to your site where coverage already exists.",
  };
}

async function buildPreviewForAddress(
  memberEmail: string,
  input: BallotAddressInput
): Promise<BallotPreview> {
  const normalized = normalizeAddressInput(input);
  validateCaliforniaAddress(normalized);
  const officialPreview = await buildOfficialPreviewForAddress(memberEmail, normalized);

  if (officialPreview) {
    return officialPreview;
  }

  const region = getRegionForCounty(normalized.county);
  const election = await readActiveElection();
  const candidates = await listPortalContent("candidates");
  const contestSeeds = groupCandidatesForBallot(candidates, normalized.zipCode);
  const coverageNote =
    contestSeeds.some((contest) => contest.contestKey.startsWith("local:"))
      ? "This saved ballot includes statewide contests and any local races already mapped to your ZIP code."
      : "This phase-one ballot profile includes statewide contests now. District-level contests will expand as official California ballot data is connected.";

  const address: BallotAddressRecord = {
    id: randomUUID(),
    memberEmail,
    street1: normalized.street1,
    street2: normalized.street2,
    city: normalized.city,
    state: "CA",
    zipCode: normalized.zipCode,
    county: normalized.county,
    region,
    normalizedAddress: buildNormalizedAddress(normalized),
    lookupProvider: "internal-phase-1",
    lookupStatus: "preview_ready",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return {
    election,
    address,
    pollingLocations: [],
    earlyVotingSites: [],
    dropBoxes: [],
    lookupMode: "internal",
    coverageNote,
    contests: contestSeeds.map((contest, index) => ({
      id: `${contest.contestKey}:${index}`,
      contestKey: contest.contestKey,
      contestType: contest.contestType,
      officeName: contest.officeName,
      districtName: contest.districtName,
      districtNumber: contest.districtNumber,
      ballotTitle: contest.ballotTitle,
      sortOrder: contest.sortOrder,
      matchedCandidates: contest.matchedCandidates.map((candidate) => ({
        id: candidate.id,
        title: candidate.title,
        href: `/candidates/${candidate.id}`,
      })),
      officialCandidateNames: contest.officialCandidateNames,
    })),
  };
}

async function readSavedAddressFromDatabase(memberEmail: string) {
  await ensureBallotTables();
  const sql = getSql();
  const rows = await sql<AddressRow[]>`
    select
      id,
      member_email,
      street_1,
      street_2,
      city,
      state,
      zip_code,
      county,
      region,
      normalized_address,
      lookup_provider,
      lookup_status,
      created_at,
      updated_at
    from member_ballot_addresses
    where member_email = ${memberEmail}
    limit 1
  `;

  return rows[0] ? mapAddressRow(rows[0]) : undefined;
}

async function upsertSavedAddressInDatabase(address: BallotAddressRecord) {
  await ensureBallotTables();
  const sql = getSql();
  await sql`
    insert into member_ballot_addresses (
      id,
      member_email,
      street_1,
      street_2,
      city,
      state,
      zip_code,
      county,
      region,
      normalized_address,
      lookup_provider,
      lookup_status,
      created_at,
      updated_at
    )
    values (
      ${address.id},
      ${address.memberEmail},
      ${address.street1},
      ${address.street2 ?? null},
      ${address.city},
      ${address.state},
      ${address.zipCode},
      ${address.county},
      ${address.region ?? null},
      ${address.normalizedAddress},
      ${address.lookupProvider},
      ${address.lookupStatus},
      ${address.createdAt},
      ${address.updatedAt}
    )
    on conflict (member_email) do update
    set
      street_1 = excluded.street_1,
      street_2 = excluded.street_2,
      city = excluded.city,
      state = excluded.state,
      zip_code = excluded.zip_code,
      county = excluded.county,
      region = excluded.region,
      normalized_address = excluded.normalized_address,
      lookup_provider = excluded.lookup_provider,
      lookup_status = excluded.lookup_status,
      updated_at = excluded.updated_at
  `;
}

async function readSavedBallotFromDatabase(memberEmail: string) {
  const election = await readActiveElectionFromDatabase();
  const address = await readSavedAddressFromDatabase(memberEmail);

  if (!address) {
    return { election, address: undefined, ballot: undefined, contests: [] as BallotContestView[] };
  }

  await ensureBallotTables();
  const sql = getSql();
  const ballotRows = await sql<BallotRow[]>`
    select
      id,
      member_email,
      election_id,
      address_id,
      county,
      region,
      division_ocd_id,
      polling_location_json,
      early_vote_json,
      drop_box_json,
      coverage_note,
      generated_at,
      updated_at
    from member_ballots
    where member_email = ${memberEmail}
      and election_id = ${election.id}
    limit 1
  `;

  const ballot = ballotRows[0] ? mapBallotRow(ballotRows[0]) : undefined;

  if (!ballot) {
    return { election, address, ballot: undefined, contests: [] as BallotContestView[] };
  }

  const contestRows = await sql<ContestRow[]>`
    select
      id,
      ballot_id,
      contest_key,
      contest_type,
      office_name,
      district_name,
      district_number,
      ballot_title,
      sort_order,
      contest_json,
      created_at
    from ballot_contests
    where ballot_id = ${ballot.id}
    order by sort_order asc, created_at asc
  `;
  const contests = contestRows.map(mapContestRow);
  const matches = contests.length
    ? (
        await sql<MatchRow[]>`
          select
            id,
            contest_id,
            candidate_content_id,
            match_confidence,
            review_status,
            reviewed_by,
            reviewed_at
          from contest_candidate_matches
          where contest_id in ${sql(contests.map((contest) => contest.id))}
        `
      ).map(mapMatchRow)
    : [];
  const candidates = await listPortalContent("candidates");
  const candidatesById = new Map(candidates.map((candidate) => [candidate.id, candidate]));

  return {
    election,
    address,
    ballot,
    contests: contests.map((contest) => ({
      id: contest.id,
      contestKey: contest.contestKey,
      contestType: contest.contestType,
      officeName: contest.officeName,
      districtName: contest.districtName,
      districtNumber: contest.districtNumber,
      ballotTitle: contest.ballotTitle,
      sortOrder: contest.sortOrder,
      matchedCandidates: matches
        .filter((match) => match.contestId === contest.id)
        .map((match) => candidatesById.get(match.candidateContentId))
        .filter(Boolean)
        .map((candidate) => ({
          id: candidate!.id,
          title: candidate!.title,
          href: `/candidates/${candidate!.id}`,
        })),
      officialCandidateNames: Array.isArray(contest.contestJson.matchedCandidateIds)
        ? undefined
        : Array.isArray((contest.contestJson as { officialCandidateNames?: unknown }).officialCandidateNames)
          ? ((contest.contestJson as { officialCandidateNames?: unknown }).officialCandidateNames as string[])
          : undefined,
    })),
  };
}

async function readSavedBallotFromFile(memberEmail: string) {
  const file = await readBallotFile();
  const election =
    file.elections.find((entry) => entry.isActive) || (await readActiveElectionFromFile());
  const address = file.addresses.find((entry) => entry.memberEmail === memberEmail);
  const ballot = file.ballots.find(
    (entry) => entry.memberEmail === memberEmail && entry.electionId === election.id
  );

  if (!address || !ballot) {
    return { election, address, ballot, contests: [] as BallotContestView[] };
  }

  const contests = file.contests.filter((entry) => entry.ballotId === ballot.id);
  const matches = file.matches;
  const candidates = await listPortalContent("candidates");
  const candidatesById = new Map(candidates.map((candidate) => [candidate.id, candidate]));

  return {
    election,
    address,
    ballot,
    contests: contests
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map((contest) => ({
        id: contest.id,
        contestKey: contest.contestKey,
        contestType: contest.contestType,
        officeName: contest.officeName,
        districtName: contest.districtName,
        districtNumber: contest.districtNumber,
        ballotTitle: contest.ballotTitle,
        sortOrder: contest.sortOrder,
        matchedCandidates: matches
          .filter((match) => match.contestId === contest.id)
          .map((match) => candidatesById.get(match.candidateContentId))
          .filter(Boolean)
          .map((candidate) => ({
            id: candidate!.id,
            title: candidate!.title,
            href: `/candidates/${candidate!.id}`,
          })),
        officialCandidateNames: Array.isArray(
          (contest.contestJson as { officialCandidateNames?: unknown }).officialCandidateNames
        )
          ? ((contest.contestJson as { officialCandidateNames?: unknown }).officialCandidateNames as string[])
          : undefined,
      })),
  };
}

export async function readMemberBallot(memberEmail: string) {
  const saved = shouldUseDatabase()
    ? await readSavedBallotFromDatabase(memberEmail)
    : await readSavedBallotFromFile(memberEmail);
  const profile = await readMemberProfile(memberEmail);

  return {
    ...saved,
    suggestedAddress: profile
      ? {
          street1: profile.streetAddress ?? "",
          city: profile.city ?? "",
          state: "CA" as const,
          zipCode: profile.zipCode ?? "",
          county: profile.county ?? "",
        }
      : undefined,
  };
}

export async function previewMemberBallot(memberEmail: string, input: BallotAddressInput) {
  return buildPreviewForAddress(memberEmail, input);
}

async function saveBallotToDatabase(preview: BallotPreview) {
  await ensureBallotTables();
  const sql = getSql();
  const now = new Date().toISOString();
  const existingAddress = await readSavedAddressFromDatabase(preview.address.memberEmail);
  const address = {
    ...preview.address,
    id: existingAddress?.id ?? preview.address.id,
    createdAt: existingAddress?.createdAt ?? preview.address.createdAt,
    updatedAt: now,
  };

  await upsertSavedAddressInDatabase(address);

  const existingBallotRows = await sql<BallotRow[]>`
    select
      id,
      member_email,
      election_id,
      address_id,
      county,
      region,
      division_ocd_id,
      polling_location_json,
      early_vote_json,
      drop_box_json,
      coverage_note,
      generated_at,
      updated_at
    from member_ballots
    where member_email = ${preview.address.memberEmail}
      and election_id = ${preview.election.id}
    limit 1
  `;
  const existingBallot = existingBallotRows[0] ? mapBallotRow(existingBallotRows[0]) : undefined;
  const ballot: BallotSnapshotRecord = {
    id: existingBallot?.id ?? randomUUID(),
    memberEmail: preview.address.memberEmail,
    electionId: preview.election.id,
    addressId: address.id,
    county: address.county,
    region: address.region,
    pollingLocations: preview.pollingLocations,
    earlyVotingSites: preview.earlyVotingSites,
    dropBoxes: preview.dropBoxes,
    coverageNote: preview.coverageNote,
    generatedAt: existingBallot?.generatedAt ?? now,
    updatedAt: now,
  };

  await sql`update elections set is_active = false where is_active = true and id <> ${preview.election.id}`;
  await sql`
    insert into elections (id, provider_election_id, name, election_date, is_active, created_at, updated_at)
    values (
      ${preview.election.id},
      ${preview.election.providerElectionId},
      ${preview.election.name},
      ${preview.election.electionDate ?? null},
      true,
      ${preview.election.createdAt},
      ${now}
    )
    on conflict (provider_election_id) do update
    set
      name = excluded.name,
      election_date = excluded.election_date,
      is_active = excluded.is_active,
      updated_at = excluded.updated_at
  `;

  await sql`
    insert into member_ballots (
      id,
      member_email,
      election_id,
      address_id,
      county,
      region,
      division_ocd_id,
      polling_location_json,
      early_vote_json,
      drop_box_json,
      coverage_note,
      generated_at,
      updated_at
    )
    values (
      ${ballot.id},
      ${ballot.memberEmail},
      ${ballot.electionId},
      ${ballot.addressId},
      ${ballot.county},
      ${ballot.region ?? null},
      ${ballot.divisionOcdId ?? null},
      ${sql.json(ballot.pollingLocations as never)},
      ${sql.json(ballot.earlyVotingSites as never)},
      ${sql.json(ballot.dropBoxes as never)},
      ${ballot.coverageNote ?? null},
      ${ballot.generatedAt},
      ${ballot.updatedAt}
    )
    on conflict (member_email, election_id) do update
    set
      address_id = excluded.address_id,
      county = excluded.county,
      region = excluded.region,
      coverage_note = excluded.coverage_note,
      updated_at = excluded.updated_at
  `;

  await sql`delete from contest_candidate_matches where contest_id in (
    select id from ballot_contests where ballot_id = ${ballot.id}
  )`;
  await sql`delete from ballot_contests where ballot_id = ${ballot.id}`;

  for (const contest of preview.contests) {
    const contestId = randomUUID();
    await sql`
      insert into ballot_contests (
        id,
        ballot_id,
        contest_key,
        contest_type,
        office_name,
        district_name,
        district_number,
        ballot_title,
        sort_order,
        contest_json,
        created_at
      )
      values (
        ${contestId},
        ${ballot.id},
        ${contest.contestKey},
        ${contest.contestType},
        ${contest.officeName ?? null},
        ${contest.districtName ?? null},
        ${contest.districtNumber ?? null},
        ${contest.ballotTitle},
        ${contest.sortOrder},
        ${sql.json({
          matchedCandidateIds: contest.matchedCandidates.map((candidate) => candidate.id),
          officialCandidateNames: contest.officialCandidateNames ?? [],
        })},
        ${now}
      )
    `;

    for (const candidate of contest.matchedCandidates) {
      await sql`
        insert into contest_candidate_matches (
          id,
          contest_id,
          candidate_content_id,
          match_confidence,
          review_status
        )
        values (
          ${randomUUID()},
          ${contestId},
          ${candidate.id},
          1,
          'auto'
        )
      `;
    }
  }

  return readSavedBallotFromDatabase(preview.address.memberEmail);
}

async function saveBallotToFile(preview: BallotPreview) {
  const file = await readBallotFile();
  const now = new Date().toISOString();
  const existingAddress = file.addresses.find(
    (entry) => entry.memberEmail === preview.address.memberEmail
  );
  const address = {
    ...preview.address,
    id: existingAddress?.id ?? preview.address.id,
    createdAt: existingAddress?.createdAt ?? preview.address.createdAt,
    updatedAt: now,
  };
  const nextAddresses = existingAddress
    ? file.addresses.map((entry) =>
        entry.memberEmail === address.memberEmail ? address : entry
      )
    : [...file.addresses, address];

  const existingBallot = file.ballots.find(
    (entry) =>
      entry.memberEmail === preview.address.memberEmail &&
      entry.electionId === preview.election.id
  );
  const ballot: BallotSnapshotRecord = {
    id: existingBallot?.id ?? randomUUID(),
    memberEmail: preview.address.memberEmail,
    electionId: preview.election.id,
    addressId: address.id,
    county: address.county,
    region: address.region,
    pollingLocations: preview.pollingLocations,
    earlyVotingSites: preview.earlyVotingSites,
    dropBoxes: preview.dropBoxes,
    coverageNote: preview.coverageNote,
    generatedAt: existingBallot?.generatedAt ?? now,
    updatedAt: now,
  };
  const nextBallots = existingBallot
    ? file.ballots.map((entry) => (entry.id === ballot.id ? ballot : entry))
    : [...file.ballots, ballot];

  const nextContests = file.contests.filter((entry) => entry.ballotId !== ballot.id);
  const nextMatches = file.matches.filter(
    (entry) => !file.contests.some((contest) => contest.id === entry.contestId && contest.ballotId === ballot.id)
  );

  for (const contest of preview.contests) {
    const contestId = randomUUID();
    nextContests.push({
      id: contestId,
      ballotId: ballot.id,
      contestKey: contest.contestKey,
      contestType: contest.contestType,
      officeName: contest.officeName,
      districtName: contest.districtName,
      districtNumber: contest.districtNumber,
      ballotTitle: contest.ballotTitle,
      sortOrder: contest.sortOrder,
      contestJson: {
        matchedCandidateIds: contest.matchedCandidates.map((candidate) => candidate.id),
        officialCandidateNames: contest.officialCandidateNames ?? [],
      },
      createdAt: now,
    });

    for (const candidate of contest.matchedCandidates) {
      nextMatches.push({
        id: randomUUID(),
        contestId,
        candidateContentId: candidate.id,
        matchConfidence: 1,
        reviewStatus: "auto",
      });
    }
  }

  await writeBallotFile({
    ...file,
    addresses: nextAddresses,
    elections: file.elections.some((entry) => entry.id === preview.election.id)
      ? file.elections
      : [...file.elections, preview.election],
    ballots: nextBallots,
    contests: nextContests,
    matches: nextMatches,
  });

  return readSavedBallotFromFile(preview.address.memberEmail);
}

export async function saveMemberBallot(memberEmail: string, input: BallotAddressInput) {
  const preview = await buildPreviewForAddress(memberEmail, input);
  return shouldUseDatabase() ? saveBallotToDatabase(preview) : saveBallotToFile(preview);
}

export async function getBallotAnalyticsOverview(): Promise<BallotAnalyticsOverview> {
  const activeElection = await readActiveElection();

  if (shouldUseDatabase()) {
    await ensureBallotTables();
    const sql = getSql();
    const addressRows = await sql<AddressRow[]>`
      select
        id,
        member_email,
        street_1,
        street_2,
        city,
        state,
        zip_code,
        county,
        region,
        normalized_address,
        lookup_provider,
        lookup_status,
        created_at,
        updated_at
      from member_ballot_addresses
    `;
    const ballotRows = await sql<BallotRow[]>`
      select
        id,
        member_email,
        election_id,
        address_id,
        county,
        region,
        division_ocd_id,
        polling_location_json,
        early_vote_json,
        drop_box_json,
        coverage_note,
        generated_at,
        updated_at
      from member_ballots
      where election_id = ${activeElection.id}
    `;

    const addresses = addressRows.map(mapAddressRow);
    const ballots = ballotRows.map(mapBallotRow);

    return {
      totalSavedAddresses: addresses.length,
      totalSavedBallots: ballots.length,
      activeElectionName: activeElection.name,
      byCounty: summarizeCounts(addresses.map((entry) => entry.county)),
      byRegion: summarizeCounts(
        addresses.map((entry) => entry.region).filter(Boolean) as string[]
      ),
    };
  }

  const file = await readBallotFile();
  const ballots = file.ballots.filter((entry) => entry.electionId === activeElection.id);

  return {
    totalSavedAddresses: file.addresses.length,
    totalSavedBallots: ballots.length,
    activeElectionName: activeElection.name,
    byCounty: summarizeCounts(file.addresses.map((entry) => entry.county)),
    byRegion: summarizeCounts(
      file.addresses.map((entry) => entry.region).filter(Boolean) as string[]
    ),
  };
}
