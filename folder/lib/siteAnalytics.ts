import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import postgres from "postgres";

export type AnalyticsEventType = "page_view" | "content_click";

export type AnalyticsContentKind =
  | "candidates"
  | "events"
  | "stories"
  | "organizations";

export type AnalyticsEvent = {
  id: string;
  sessionId: string;
  memberEmail?: string;
  eventType: AnalyticsEventType;
  path: string;
  previousPath?: string;
  referrerUrl?: string;
  referrerHost?: string;
  targetPath?: string;
  contentKind?: AnalyticsContentKind;
  contentId?: string;
  title?: string;
  createdAt: string;
};

type AnalyticsEventRow = {
  id: string;
  session_id: string;
  member_email: string | null;
  event_type: AnalyticsEventType;
  path: string;
  previous_path: string | null;
  referrer_url: string | null;
  referrer_host: string | null;
  target_path: string | null;
  content_kind: AnalyticsContentKind | null;
  content_id: string | null;
  title: string | null;
  created_at: Date | string;
};

type AnalyticsFileShape = {
  events: AnalyticsEvent[];
};

type AnalyticsSummaryItem = {
  label: string;
  count: number;
};

type ContentClickSummaryItem = {
  contentKind: AnalyticsContentKind;
  contentId: string;
  title: string;
  targetPath: string;
  count: number;
};

type PathTransitionItem = {
  fromPath: string;
  toPath: string;
  count: number;
};

export type AnalyticsOverview = {
  totalPageViews: number;
  totalContentClicks: number;
  topReferrers: AnalyticsSummaryItem[];
  topEntryPages: AnalyticsSummaryItem[];
  topViewedPages: AnalyticsSummaryItem[];
  topTransitions: PathTransitionItem[];
  topContentClicks: ContentClickSummaryItem[];
};

const databaseUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;
const dataDirectory = path.join(process.cwd(), "data");
const analyticsPath = path.join(dataDirectory, "siteAnalytics.json");

declare global {
  var __siteAnalyticsSql: ReturnType<typeof postgres> | undefined;
  var __siteAnalyticsTableReady: Promise<void> | undefined;
}

function shouldUseDatabase() {
  return Boolean(databaseUrl);
}

function getSql() {
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not configured.");
  }

  if (!globalThis.__siteAnalyticsSql) {
    globalThis.__siteAnalyticsSql = postgres(databaseUrl, {
      ssl: "require",
      max: 1,
      prepare: false,
    });
  }

  return globalThis.__siteAnalyticsSql;
}

async function ensureAnalyticsFile() {
  await mkdir(dataDirectory, { recursive: true });

  try {
    await readFile(analyticsPath, "utf8");
  } catch {
    await writeFile(analyticsPath, `${JSON.stringify({ events: [] }, null, 2)}\n`, "utf8");
  }
}

async function readAnalyticsFile() {
  await ensureAnalyticsFile();

  try {
    const raw = await readFile(analyticsPath, "utf8");
    return JSON.parse(raw) as AnalyticsFileShape;
  } catch {
    const fallback = { events: [] };
    await writeFile(analyticsPath, `${JSON.stringify(fallback, null, 2)}\n`, "utf8");
    return fallback;
  }
}

async function writeAnalyticsFile(content: AnalyticsFileShape) {
  await ensureAnalyticsFile();
  await writeFile(analyticsPath, `${JSON.stringify(content, null, 2)}\n`, "utf8");
}

async function ensureAnalyticsTable() {
  if (!shouldUseDatabase()) {
    return;
  }

  if (!globalThis.__siteAnalyticsTableReady) {
    const sql = getSql();
    globalThis.__siteAnalyticsTableReady = sql`
      create table if not exists site_analytics_events (
        id text primary key,
        session_id text not null,
        member_email text,
        event_type text not null,
        path text not null,
        previous_path text,
        referrer_url text,
        referrer_host text,
        target_path text,
        content_kind text,
        content_id text,
        title text,
        created_at timestamptz not null default now()
      )
    `.then(() => undefined);
  }

  await globalThis.__siteAnalyticsTableReady;
}

function normalizePath(pathname: string) {
  const trimmed = pathname.trim();
  return trimmed || "/";
}

function mapRowToEvent(row: AnalyticsEventRow): AnalyticsEvent {
  return {
    id: row.id,
    sessionId: row.session_id,
    memberEmail: row.member_email || undefined,
    eventType: row.event_type,
    path: row.path,
    previousPath: row.previous_path || undefined,
    referrerUrl: row.referrer_url || undefined,
    referrerHost: row.referrer_host || undefined,
    targetPath: row.target_path || undefined,
    contentKind: row.content_kind || undefined,
    contentId: row.content_id || undefined,
    title: row.title || undefined,
    createdAt: new Date(row.created_at).toISOString(),
  };
}

function summarizeCounts(items: string[]) {
  const counts = new Map<string, number>();

  for (const item of items) {
    counts.set(item, (counts.get(item) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((left, right) => right.count - left.count)
    .slice(0, 10);
}

function buildOverview(events: AnalyticsEvent[]): AnalyticsOverview {
  const pageViews = events.filter((event) => event.eventType === "page_view");
  const contentClicks = events.filter((event) => event.eventType === "content_click");

  const topReferrers = summarizeCounts(
    pageViews.map((event) => event.referrerHost).filter(Boolean) as string[]
  );
  const topEntryPages = summarizeCounts(
    pageViews.filter((event) => !event.previousPath).map((event) => event.path)
  );
  const topViewedPages = summarizeCounts(pageViews.map((event) => event.path));

  const transitionCounts = new Map<string, PathTransitionItem>();
  for (const event of pageViews) {
    if (!event.previousPath) {
      continue;
    }

    const key = `${event.previousPath}=>${event.path}`;
    const current = transitionCounts.get(key);

    if (current) {
      current.count += 1;
    } else {
      transitionCounts.set(key, {
        fromPath: event.previousPath,
        toPath: event.path,
        count: 1,
      });
    }
  }

  const topTransitions = [...transitionCounts.values()]
    .sort((left, right) => right.count - left.count)
    .slice(0, 10);

  const clickCounts = new Map<string, ContentClickSummaryItem>();
  for (const event of contentClicks) {
    if (!event.contentKind || !event.contentId || !event.targetPath || !event.title) {
      continue;
    }

    const key = `${event.contentKind}:${event.contentId}`;
    const current = clickCounts.get(key);

    if (current) {
      current.count += 1;
    } else {
      clickCounts.set(key, {
        contentKind: event.contentKind,
        contentId: event.contentId,
        title: event.title,
        targetPath: event.targetPath,
        count: 1,
      });
    }
  }

  const topContentClicks = [...clickCounts.values()]
    .sort((left, right) => right.count - left.count)
    .slice(0, 12);

  return {
    totalPageViews: pageViews.length,
    totalContentClicks: contentClicks.length,
    topReferrers,
    topEntryPages,
    topViewedPages,
    topTransitions,
    topContentClicks,
  };
}

export async function recordAnalyticsEvent(
  input: Omit<AnalyticsEvent, "id" | "createdAt">
) {
  const event: AnalyticsEvent = {
    id: randomUUID(),
    sessionId: input.sessionId,
    memberEmail: input.memberEmail?.trim().toLowerCase() || undefined,
    eventType: input.eventType,
    path: normalizePath(input.path),
    previousPath: input.previousPath ? normalizePath(input.previousPath) : undefined,
    referrerUrl: input.referrerUrl || undefined,
    referrerHost: input.referrerHost || undefined,
    targetPath: input.targetPath ? normalizePath(input.targetPath) : undefined,
    contentKind: input.contentKind,
    contentId: input.contentId,
    title: input.title?.trim() || undefined,
    createdAt: new Date().toISOString(),
  };

  if (shouldUseDatabase()) {
    await ensureAnalyticsTable();
    const sql = getSql();
    await sql`
      insert into site_analytics_events (
        id,
        session_id,
        member_email,
        event_type,
        path,
        previous_path,
        referrer_url,
        referrer_host,
        target_path,
        content_kind,
        content_id,
        title,
        created_at
      ) values (
        ${event.id},
        ${event.sessionId},
        ${event.memberEmail ?? null},
        ${event.eventType},
        ${event.path},
        ${event.previousPath ?? null},
        ${event.referrerUrl ?? null},
        ${event.referrerHost ?? null},
        ${event.targetPath ?? null},
        ${event.contentKind ?? null},
        ${event.contentId ?? null},
        ${event.title ?? null},
        ${event.createdAt}
      )
    `;
    return event;
  }

  const current = await readAnalyticsFile();
  current.events.push(event);
  await writeAnalyticsFile(current);
  return event;
}

export async function getAnalyticsOverview() {
  if (shouldUseDatabase()) {
    await ensureAnalyticsTable();
    const sql = getSql();
    const rows = await sql<AnalyticsEventRow[]>`
      select
        id,
        session_id,
        member_email,
        event_type,
        path,
        previous_path,
        referrer_url,
        referrer_host,
        target_path,
        content_kind,
        content_id,
        title,
        created_at
      from site_analytics_events
      order by created_at desc
      limit 5000
    `;

    return buildOverview(rows.map(mapRowToEvent));
  }

  const current = await readAnalyticsFile();
  return buildOverview(current.events);
}
