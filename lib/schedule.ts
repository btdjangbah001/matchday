import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { competitions, matches, type Competition } from "@/db/schema";
import { sourceUrl } from "@/lib/competitions";

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
// Match line: optional time, then "Team1 v Team2" (+ optional (CC) codes / score).
// Handles both league files ("Arsenal FC  v  Coventry City FC") and cup files
// ("Athletic Club (ESP)  v Arsenal FC (ENG)  0-2 (0-0)").
const MATCH_RE = /^(?:(\d{1,2}:\d{2})\s+)?(.+?)\s+v\.?\s+(.+)$/;

// Drop a trailing score (starts after 2+ spaces with a digit) and any (CC) code.
function cleanTeam(raw: string): string {
  return raw.split(/\s{2,}(?=\d)/)[0].replace(/\s*\([A-Z]{3}\)\s*$/, "").trim();
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
      const team1 = cleanTeam(matchMatch[2]);
      const team2 = cleanTeam(matchMatch[3]);
      // Skip lines that aren't real fixtures (e.g. notes, scores).
      if (team1 && team2 && !/^\d/.test(team1) && !/^\d/.test(team2)) {
        if (matchMatch[1]) time = matchMatch[1];
        out.push({ round, date, time, team1, team2 });
      }
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

// ---------- Sync ----------

/**
 * Sync one competition from its openfootball source. Real dates are stored as-is
 * (no shifting) — if a season isn't published or is over, no upcoming fixtures
 * result, which is the honest outcome. Records the sync time + fixture count.
 */
export async function syncCompetition(comp: Competition): Promise<number> {
  let count = 0;
  const res = await fetch(sourceUrl(comp.repo, comp.season, comp.file), {
    cache: "no-store",
  });

  if (res.ok) {
    const normalized =
      comp.sourceKind === "json"
        ? parseFootballJson(await res.json())
        : parseOpenfootballText(await res.text());

    const rows: (typeof matches.$inferInsert)[] = normalized.map((m) => ({
      extId: `${comp.code}-${slug(`${m.date ?? ""}-${m.team1}-${m.team2}`)}`,
      competition: comp.name,
      round: m.round,
      groupName: null,
      team1: m.team1,
      team2: m.team2,
      kickoff: parseKickoff(m.date, m.time),
      venue: null,
    }));
    count = rows.length;

    if (rows.length > 0) {
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
    }
  }

  await db
    .update(competitions)
    .set({ lastSyncedAt: new Date(), lastCount: count })
    .where(eq(competitions.id, comp.id));
  return count;
}

/** Sync one competition by id (used by the admin "Sync" button). */
export async function syncCompetitionById(id: number): Promise<number> {
  const [comp] = await db
    .select()
    .from(competitions)
    .where(eq(competitions.id, id))
    .limit(1);
  if (!comp) return 0;
  return syncCompetition(comp);
}

/** Sync every active competition. */
export async function syncSchedules(): Promise<{
  synced: number;
  competitions: number;
}> {
  const comps = await db
    .select()
    .from(competitions)
    .where(eq(competitions.active, true));

  let synced = 0;
  let withData = 0;
  for (const comp of comps) {
    const n = await syncCompetition(comp);
    if (n > 0) withData += 1;
    synced += n;
  }
  return { synced, competitions: withData };
}
