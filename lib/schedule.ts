import { sql } from "drizzle-orm";
import { db } from "@/db";
import { matches } from "@/db/schema";
import { COMPETITIONS, sourceUrl, type Competition } from "@/lib/competitions";

/** A fixture normalised from either source before it becomes a DB row. */
interface NormalizedMatch {
  round: string | null;
  date: string | null; // YYYY-MM-DD
  time: string | null; // HH:MM (local)
  team1: string;
  team2: string;
}

// ---------- Source adapter: structured football.json ----------

type TeamLike = string | { name?: string } | null | undefined;
function teamText(value: TeamLike): string | null {
  if (!value) return null;
  return typeof value === "string" ? value : value.name ?? null;
}

function parseFootballJson(raw: unknown): NormalizedMatch[] {
  const data = raw as { matches?: Array<Record<string, unknown>> };
  return (data.matches ?? []).map((m) => ({
    round: (m.round as string) ?? null,
    date: (m.date as string) ?? null,
    time: (m.time as string) ?? null,
    team1: teamText(m.team1 as TeamLike) ?? "TBD",
    team2: teamText(m.team2 as TeamLike) ?? "TBD",
  }));
}

// ---------- Source adapter: openfootball text DSL ----------

const MONTHS: Record<string, number> = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
};

// Header line, e.g. "▪ League, Matchday 1" or "» Round of 16".
const ROUND_RE = /^[»▪●•]\s*(.+?)\s*$/;
// Date line, e.g. "Tue Sep 16 2025" or "Wed Sep 17".
const DATE_RE = /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+([A-Z][a-z]{2})\s+(\d{1,2})(?:\s+(\d{4}))?$/;
// Match line: optional time, "Team1 (CC) v Team2 (CC)" then optional score.
const MATCH_RE = /^(?:(\d{1,2}:\d{2})\s+)?(.+?\([A-Z]{3}\))\s+v\.?\s+(.+?\([A-Z]{3}\))(?:\s+.*)?$/;

function stripCountry(name: string): string {
  return name.replace(/\s*\([A-Z]{3}\)\s*$/, "").trim();
}

export function parseOpenfootballText(text: string): NormalizedMatch[] {
  const out: NormalizedMatch[] = [];
  let round: string | null = null;
  let date: string | null = null;
  let time: string | null = null;
  let year = new Date().getUTCFullYear();
  let prevMonth = -1;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || line.startsWith("=")) continue;

    const roundMatch = ROUND_RE.exec(line);
    if (roundMatch) {
      round = roundMatch[1];
      time = null;
      continue;
    }

    const dateMatch = DATE_RE.exec(line);
    if (dateMatch) {
      const month = MONTHS[dateMatch[2]] ?? 0;
      if (dateMatch[4]) {
        year = Number(dateMatch[4]);
      } else if (prevMonth !== -1 && month < prevMonth) {
        year += 1; // season rolled from Dec into Jan
      }
      prevMonth = month;
      const day = Number(dateMatch[3]);
      date = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      time = null;
      continue;
    }

    const matchMatch = MATCH_RE.exec(line);
    if (matchMatch && date) {
      if (matchMatch[1]) time = matchMatch[1];
      out.push({
        round,
        date,
        time,
        team1: stripCountry(matchMatch[2]),
        team2: stripCountry(matchMatch[3]),
      });
    }
  }
  return out;
}

// ---------- Shared: kickoff parsing + demo season shift ----------

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

// "20:00" (local) or "20:00 UTC-6". Stored as a UTC instant and always displayed
// in UTC, so the advertised time is what shows. (Per-venue timezone handling is
// a documented simplification — see the technical-debt register.)
function parseKickoff(date: string | null, time: string | null): Date | null {
  if (!date) return null;
  const dm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!dm) return null;
  const [, y, mo, d] = dm.map(Number);
  const tm = time ? /^(\d{1,2}):(\d{2})(?:\s*UTC\s*([+-]\d{1,2}))?/.exec(time) : null;
  if (!tm) return new Date(Date.UTC(y, mo - 1, d));
  const offset = tm[3] ? Number(tm[3]) : 0;
  return new Date(Date.UTC(y, mo - 1, d, Number(tm[1]) - offset, Number(tm[2])));
}

/**
 * DEMO AFFORDANCE (disclosed in Limitations): if an entire synced season is
 * already in the past — e.g. openfootball hasn't published the new season yet —
 * roll every kickoff forward by whole years so upcoming fixtures exist to book.
 * With live current-season data this is a no-op. Disable with
 * SCHEDULE_SHIFT_PAST_SEASONS=false. The ext_id is keyed on the ORIGINAL date,
 * so a later re-sync updates rows in place rather than duplicating them.
 */
function shiftPastSeasonToUpcoming(rows: (typeof matches.$inferInsert)[]): void {
  if (process.env.SCHEDULE_SHIFT_PAST_SEASONS === "false") return;
  const times = rows
    .map((r) => r.kickoff?.getTime())
    .filter((t): t is number => typeof t === "number");
  if (times.length === 0) return;
  const now = Date.now();
  const latest = Math.max(...times);
  if (latest >= now) return;

  const years = Math.ceil((now - latest) / (365.25 * 86_400_000));
  for (const r of rows) {
    if (r.kickoff) {
      const d = new Date(r.kickoff);
      d.setUTCFullYear(d.getUTCFullYear() + years);
      r.kickoff = d;
    }
  }
}

// ---------- Sync ----------

async function syncCompetition(comp: Competition): Promise<number> {
  const res = await fetch(sourceUrl(comp.source), { cache: "no-store" });
  if (!res.ok) return 0; // not published yet — skip

  const normalized =
    comp.source.kind === "json"
      ? parseFootballJson(await res.json())
      : parseOpenfootballText(await res.text());

  const rows: (typeof matches.$inferInsert)[] = normalized.map((m) => ({
    // Stable per-competition key on the ORIGINAL date; teams are known in play.
    extId: `${comp.code}-${slug(`${m.date ?? ""}-${m.team1}-${m.team2}`)}`,
    competition: comp.name,
    round: m.round,
    groupName: null,
    team1: m.team1,
    team2: m.team2,
    kickoff: parseKickoff(m.date, m.time),
    venue: null,
  }));
  if (rows.length === 0) return 0;

  shiftPastSeasonToUpcoming(rows);

  await db
    .insert(matches)
    .values(rows)
    .onConflictDoUpdate({
      target: matches.extId,
      set: {
        competition: sql`excluded.competition`,
        round: sql`excluded.round`,
        team1: sql`excluded.team1`,
        team2: sql`excluded.team2`,
        kickoff: sql`excluded.kickoff`,
      },
    });
  return rows.length;
}

/** Sync every configured competition. Missing/unpublished ones are skipped. */
export async function syncSchedules(): Promise<{
  synced: number;
  competitions: number;
}> {
  let synced = 0;
  let competitions = 0;
  for (const comp of COMPETITIONS) {
    const n = await syncCompetition(comp);
    if (n > 0) competitions += 1;
    synced += n;
  }
  return { synced, competitions };
}
