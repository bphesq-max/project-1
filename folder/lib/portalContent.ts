import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";

import {
  type CandidateEntry,
  defaultCandidates,
} from "@/app/components/candidateData";
import { type PortalEvent, defaultEvents, sortEvents } from "@/app/components/eventData";
import { type NewsEntry, defaultStories } from "@/app/components/newsData";
import {
  type OrganizationEntry,
  defaultOrganizations,
} from "@/app/components/organizationData";

export type PortalContentKind =
  | "candidates"
  | "events"
  | "stories"
  | "organizations";

export type PortalContentMap = {
  candidates: CandidateEntry;
  events: PortalEvent;
  stories: NewsEntry;
  organizations: OrganizationEntry;
};

type PortalContentRow = {
  id: string;
  kind: PortalContentKind;
  payload: PortalContentMap[PortalContentKind] | string;
  created_at: Date | string;
  updated_at: Date | string;
};

type PortalContentFileShape = {
  candidates: CandidateEntry[];
  events: PortalEvent[];
  stories: NewsEntry[];
  organizations: OrganizationEntry[];
};

const databaseUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;
const dataDirectory = path.join(process.cwd(), "data");
const contentPath = path.join(dataDirectory, "portalContent.json");

const defaultContent: PortalContentFileShape = {
  candidates: defaultCandidates,
  events: defaultEvents,
  stories: defaultStories,
  organizations: defaultOrganizations,
};

declare global {
  var __portalContentSql: ReturnType<typeof postgres> | undefined;
  var __portalContentTableReady: Promise<void> | undefined;
  var __portalContentSeeded: Promise<void> | undefined;
}

function shouldUseDatabase() {
  return Boolean(databaseUrl);
}

function getSql() {
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not configured.");
  }

  if (!globalThis.__portalContentSql) {
    globalThis.__portalContentSql = postgres(databaseUrl, {
      ssl: "require",
      max: 1,
      prepare: false,
    });
  }

  return globalThis.__portalContentSql;
}

function parsePayload<T>(value: T | string): T {
  if (typeof value === "string") {
    return JSON.parse(value) as T;
  }

  return value;
}

function normalizeItem<K extends PortalContentKind>(
  kind: K,
  item: PortalContentMap[K]
): PortalContentMap[K] {
  if (kind === "events") {
    const event = item as PortalEvent;
    return {
      ...event,
      title: event.title.trim(),
      location: event.location.trim(),
      description: event.description.trim(),
      region: event.region.trim(),
      sourceUrl: event.sourceUrl?.trim() || undefined,
    } as PortalContentMap[K];
  }

  if (kind === "stories") {
    const story = item as NewsEntry;
    return {
      ...story,
      title: story.title.trim(),
      region: story.region.trim(),
      status: story.status.trim(),
      category: story.category.trim(),
      summary: story.summary.trim(),
      body: story.body.trim(),
      sourceUrl: story.sourceUrl?.trim() || undefined,
    } as PortalContentMap[K];
  }

  if (kind === "organizations") {
    const organization = item as OrganizationEntry;
    return {
      ...organization,
      title: organization.title.trim(),
      summary: organization.summary?.trim() || undefined,
      body: organization.body?.trim() || undefined,
      region: organization.region?.trim() || undefined,
      sourceUrl: organization.sourceUrl?.trim() || undefined,
      xUrl: organization.xUrl?.trim() || undefined,
      facebookUrl: organization.facebookUrl?.trim() || undefined,
      instagramUrl: organization.instagramUrl?.trim() || undefined,
    } as PortalContentMap[K];
  }

  const candidate = item as CandidateEntry;
  return {
    ...candidate,
    title: candidate.title.trim(),
    summary: candidate.summary?.trim() || undefined,
    body: candidate.body?.trim() || undefined,
    sourceUrl: candidate.sourceUrl?.trim() || undefined,
    xUrl: candidate.xUrl?.trim() || undefined,
    facebookUrl: candidate.facebookUrl?.trim() || undefined,
    instagramUrl: candidate.instagramUrl?.trim() || undefined,
  } as PortalContentMap[K];
}

function sortItems<K extends PortalContentKind>(kind: K, items: PortalContentMap[K][]) {
  if (kind === "events") {
    return sortEvents(items as PortalEvent[]) as PortalContentMap[K][];
  }

  return [...items];
}

async function ensureContentFile() {
  await mkdir(dataDirectory, { recursive: true });

  try {
    await readFile(contentPath, "utf8");
  } catch {
    await writeFile(contentPath, `${JSON.stringify(defaultContent, null, 2)}\n`, "utf8");
  }
}

async function readContentFile() {
  await ensureContentFile();

  try {
    const raw = await readFile(contentPath, "utf8");
    return JSON.parse(raw) as PortalContentFileShape;
  } catch {
    await writeFile(contentPath, `${JSON.stringify(defaultContent, null, 2)}\n`, "utf8");
    return defaultContent;
  }
}

async function writeContentFile(content: PortalContentFileShape) {
  await ensureContentFile();
  await writeFile(contentPath, `${JSON.stringify(content, null, 2)}\n`, "utf8");
}

async function ensureContentTable() {
  if (!shouldUseDatabase()) {
    return;
  }

  if (!globalThis.__portalContentTableReady) {
    const sql = getSql();
    globalThis.__portalContentTableReady = sql`
      create table if not exists portal_content (
        id text not null,
        kind text not null,
        payload jsonb not null,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now(),
        primary key (kind, id)
      )
    `.then(() => undefined);
  }

  await globalThis.__portalContentTableReady;
}

async function seedDefaultsIfNeeded() {
  if (!shouldUseDatabase()) {
    return;
  }

  if (!globalThis.__portalContentSeeded) {
    const sql = getSql();
    globalThis.__portalContentSeeded = (async () => {
      await ensureContentTable();
      const countRows = await sql<{ count: string }[]>`
        select count(*)::text as count from portal_content
      `;
      if (Number(countRows[0]?.count || "0") > 0) {
        return;
      }

      const now = new Date().toISOString();
      for (const kind of Object.keys(defaultContent) as PortalContentKind[]) {
        const items = defaultContent[kind];
        for (const item of items) {
          await sql`
            insert into portal_content (id, kind, payload, created_at, updated_at)
            values (${item.id}, ${kind}, ${sql.json(item)}, ${now}, ${now})
            on conflict (kind, id) do nothing
          `;
        }
      }
    })();
  }

  await globalThis.__portalContentSeeded;
}

async function readItemsFromDatabase<K extends PortalContentKind>(kind: K) {
  await seedDefaultsIfNeeded();
  const sql = getSql();
  const rows = await sql<PortalContentRow[]>`
    select id, kind, payload, created_at, updated_at
    from portal_content
    where kind = ${kind}
    order by created_at asc
  `;

  const items = rows.map((row) =>
    normalizeItem(
      kind,
      parsePayload<PortalContentMap[K]>(
        row.payload as string | PortalContentMap[K]
      )
    )
  );

  return sortItems(kind, items);
}

async function readItemFromDatabase<K extends PortalContentKind>(kind: K, id: string) {
  await seedDefaultsIfNeeded();
  const sql = getSql();
  const rows = await sql<PortalContentRow[]>`
    select id, kind, payload, created_at, updated_at
    from portal_content
    where kind = ${kind} and id = ${id}
    limit 1
  `;

  return rows[0]
    ? normalizeItem(
        kind,
        parsePayload<PortalContentMap[K]>(
          rows[0].payload as string | PortalContentMap[K]
        )
      )
    : undefined;
}

async function upsertItemInDatabase<K extends PortalContentKind>(
  kind: K,
  item: PortalContentMap[K]
) {
  await seedDefaultsIfNeeded();
  const sql = getSql();
  const normalized = normalizeItem(kind, item);
  const now = new Date().toISOString();

  await sql`
    insert into portal_content (id, kind, payload, created_at, updated_at)
    values (${normalized.id}, ${kind}, ${sql.json(normalized)}, ${now}, ${now})
    on conflict (kind, id) do update
    set payload = excluded.payload,
        updated_at = excluded.updated_at
  `;

  return normalized;
}

async function deleteItemFromDatabase(kind: PortalContentKind, id: string) {
  await seedDefaultsIfNeeded();
  const sql = getSql();
  await sql`
    delete from portal_content
    where kind = ${kind} and id = ${id}
  `;
}

export async function listPortalContent<K extends PortalContentKind>(kind: K) {
  if (shouldUseDatabase()) {
    return readItemsFromDatabase(kind);
  }

  const content = await readContentFile();
  return sortItems(kind, content[kind] as PortalContentMap[K][]);
}

export async function readPortalContentItem<K extends PortalContentKind>(kind: K, id: string) {
  if (shouldUseDatabase()) {
    return readItemFromDatabase(kind, id);
  }

  const content = await readContentFile();
  return (content[kind] as PortalContentMap[K][]).find((item) => item.id === id);
}

export async function upsertPortalContentItem<K extends PortalContentKind>(
  kind: K,
  item: PortalContentMap[K]
) {
  if (shouldUseDatabase()) {
    return upsertItemInDatabase(kind, item);
  }

  const content = await readContentFile();
  const normalized = normalizeItem(kind, item);
  const items = content[kind] as PortalContentMap[K][];
  const nextItems = items.some((entry) => entry.id === normalized.id)
    ? items.map((entry) => (entry.id === normalized.id ? normalized : entry))
    : [...items, normalized];

  await writeContentFile({
    ...content,
    [kind]: sortItems(kind, nextItems),
  });

  return normalized;
}

export async function deletePortalContentItem(kind: PortalContentKind, id: string) {
  if (shouldUseDatabase()) {
    await deleteItemFromDatabase(kind, id);
    return;
  }

  const content = await readContentFile();
  await writeContentFile({
    ...content,
    [kind]: content[kind].filter((item) => item.id !== id),
  });
}
