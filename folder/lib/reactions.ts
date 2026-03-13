import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";

import { normalizeEmail } from "@/lib/utils";
import {
  readPortalContentItem,
  type PortalContentKind,
} from "./portalContent";

export type ReactionValue = "heart" | "thumbs_up" | "thumbs_down";

export type ReactionRecord = {
  memberEmail: string;
  contentKind: PortalContentKind;
  contentId: string;
  reaction: ReactionValue;
  createdAt: string;
  updatedAt: string;
};

export type ReactionSummaryItem = {
  contentKind: PortalContentKind;
  contentId: string;
  title: string;
  heartCount: number;
  thumbsUpCount: number;
  thumbsDownCount: number;
};

export type MemberReactionDetail = ReactionRecord & {
  title: string;
};

type ReactionRow = {
  member_email: string;
  content_kind: PortalContentKind;
  content_id: string;
  reaction: ReactionValue;
  created_at: Date | string;
  updated_at: Date | string;
};

const databaseUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;
const dataDirectory = path.join(process.cwd(), "data");
const reactionsPath = path.join(dataDirectory, "reactions.json");

declare global {
  var __reactionSql: ReturnType<typeof postgres> | undefined;
  var __reactionsTableReady: Promise<void> | undefined;
}

function shouldUseDatabase() {
  return Boolean(databaseUrl);
}

function getSql() {
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not configured.");
  }

  if (!globalThis.__reactionSql) {
    globalThis.__reactionSql = postgres(databaseUrl, {
      ssl: "require",
      max: 1,
      prepare: false,
    });
  }

  return globalThis.__reactionSql;
}

async function ensureReactionsTable() {
  if (!shouldUseDatabase()) {
    return;
  }

  if (!globalThis.__reactionsTableReady) {
    const sql = getSql();
    globalThis.__reactionsTableReady = sql`
      create table if not exists reactions (
        member_email text not null,
        content_kind text not null,
        content_id text not null,
        reaction text not null,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now(),
        primary key (member_email, content_kind, content_id)
      )
    `.then(() => undefined);
  }

  await globalThis.__reactionsTableReady;
}

function mapRow(row: ReactionRow): ReactionRecord {
  return {
    memberEmail: row.member_email,
    contentKind: row.content_kind,
    contentId: row.content_id,
    reaction: row.reaction,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

async function ensureReactionsFile() {
  await mkdir(dataDirectory, { recursive: true });

  try {
    await readFile(reactionsPath, "utf8");
  } catch {
    await writeFile(reactionsPath, "[]\n", "utf8");
  }
}

async function readReactionFile() {
  await ensureReactionsFile();

  try {
    const raw = await readFile(reactionsPath, "utf8");
    return JSON.parse(raw) as ReactionRecord[];
  } catch {
    await writeFile(reactionsPath, "[]\n", "utf8");
    return [];
  }
}

async function writeReactionFile(reactions: ReactionRecord[]) {
  await ensureReactionsFile();
  await writeFile(reactionsPath, `${JSON.stringify(reactions, null, 2)}\n`, "utf8");
}

async function listAllReactions() {
  if (shouldUseDatabase()) {
    await ensureReactionsTable();
    const sql = getSql();
    const rows = await sql<ReactionRow[]>`
      select member_email, content_kind, content_id, reaction, created_at, updated_at
      from reactions
      order by updated_at desc
    `;
    return rows.map(mapRow);
  }

  return readReactionFile();
}

export async function getMemberReaction(
  memberEmail: string,
  contentKind: PortalContentKind,
  contentId: string
) {
  const normalizedEmail = normalizeEmail(memberEmail);

  if (shouldUseDatabase()) {
    await ensureReactionsTable();
    const sql = getSql();
    const rows = await sql<ReactionRow[]>`
      select member_email, content_kind, content_id, reaction, created_at, updated_at
      from reactions
      where member_email = ${normalizedEmail}
        and content_kind = ${contentKind}
        and content_id = ${contentId}
      limit 1
    `;
    return rows[0] ? mapRow(rows[0]) : undefined;
  }

  const reactions = await readReactionFile();
  return reactions.find(
    (entry) =>
      entry.memberEmail === normalizedEmail &&
      entry.contentKind === contentKind &&
      entry.contentId === contentId
  );
}

export async function setMemberReaction(
  memberEmail: string,
  contentKind: PortalContentKind,
  contentId: string,
  reaction: ReactionValue
) {
  const normalizedEmail = normalizeEmail(memberEmail);
  const now = new Date().toISOString();

  if (shouldUseDatabase()) {
    await ensureReactionsTable();
    const sql = getSql();
    await sql`
      insert into reactions (
        member_email,
        content_kind,
        content_id,
        reaction,
        created_at,
        updated_at
      ) values (
        ${normalizedEmail},
        ${contentKind},
        ${contentId},
        ${reaction},
        ${now},
        ${now}
      )
      on conflict (member_email, content_kind, content_id) do update
      set reaction = excluded.reaction,
          updated_at = excluded.updated_at
    `;
    return getMemberReaction(normalizedEmail, contentKind, contentId);
  }

  const reactions = await readReactionFile();
  const existing = reactions.find(
    (entry) =>
      entry.memberEmail === normalizedEmail &&
      entry.contentKind === contentKind &&
      entry.contentId === contentId
  );

  const nextRecord: ReactionRecord = {
    memberEmail: normalizedEmail,
    contentKind,
    contentId,
    reaction,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  const nextReactions = existing
    ? reactions.map((entry) =>
        entry.memberEmail === normalizedEmail &&
        entry.contentKind === contentKind &&
        entry.contentId === contentId
          ? nextRecord
          : entry
      )
    : [...reactions, nextRecord];

  await writeReactionFile(nextReactions);
  return nextRecord;
}

export async function listReactionSummary() {
  const reactions = await listAllReactions();
  const summaryMap = new Map<string, ReactionSummaryItem>();

  for (const reaction of reactions) {
    const key = `${reaction.contentKind}:${reaction.contentId}`;
    const existing = summaryMap.get(key);
    const content =
      existing ??
      (await readPortalContentItem(reaction.contentKind, reaction.contentId));

    if (!existing) {
      summaryMap.set(key, {
        contentKind: reaction.contentKind,
        contentId: reaction.contentId,
        title:
          content && "title" in content ? content.title : `${reaction.contentKind} ${reaction.contentId}`,
        heartCount: 0,
        thumbsUpCount: 0,
        thumbsDownCount: 0,
      });
    }

    const entry = summaryMap.get(key)!;

    if (reaction.reaction === "heart") {
      entry.heartCount += 1;
    } else if (reaction.reaction === "thumbs_up") {
      entry.thumbsUpCount += 1;
    } else {
      entry.thumbsDownCount += 1;
    }
  }

  return [...summaryMap.values()].sort((left, right) => {
    const leftScore = left.heartCount + left.thumbsUpCount + left.thumbsDownCount;
    const rightScore = right.heartCount + right.thumbsUpCount + right.thumbsDownCount;
    return rightScore - leftScore || left.title.localeCompare(right.title);
  });
}

export async function listMemberReactions(memberEmail: string) {
  const normalizedEmail = normalizeEmail(memberEmail);
  const reactions = await listAllReactions();
  const memberReactions = reactions.filter((entry) => entry.memberEmail === normalizedEmail);

  const details = await Promise.all(
    memberReactions.map(async (reaction) => {
      const content = await readPortalContentItem(reaction.contentKind, reaction.contentId);
      return {
        ...reaction,
        title:
          content && "title" in content ? content.title : `${reaction.contentKind} ${reaction.contentId}`,
      } satisfies MemberReactionDetail;
    })
  );

  return details.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export async function listReactionsForAllMembers() {
  const reactions = await listAllReactions();
  const grouped = new Map<string, MemberReactionDetail[]>();

  for (const reaction of reactions) {
    const content = await readPortalContentItem(reaction.contentKind, reaction.contentId);
    const detail: MemberReactionDetail = {
      ...reaction,
      title:
        content && "title" in content ? content.title : `${reaction.contentKind} ${reaction.contentId}`,
    };
    const existing = grouped.get(reaction.memberEmail) ?? [];
    existing.push(detail);
    grouped.set(reaction.memberEmail, existing);
  }

  return grouped;
}
