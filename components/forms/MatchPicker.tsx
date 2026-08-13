"use client";

import { useMemo, useState } from "react";
import {
  displayTeam,
  formatKickoffDay,
  formatKickoffTime,
  formatMoney,
} from "@/lib/format";
import { Badge, inputClass } from "@/components/ui";

export interface PickerMatch {
  id: number;
  competition: string | null;
  team1: string;
  team2: string;
  kickoff: string | null;
  priceMinor: number;
  remaining: number;
}

const PAGE = 8;

function toDate(value: string | null): Date | null {
  return value ? new Date(value) : null;
}

export function MatchPicker({
  matches,
  selectedId,
  name = "matchId",
}: {
  matches: PickerMatch[];
  selectedId?: number;
  name?: string;
}) {
  const [chosen, setChosen] = useState<number | undefined>(
    matches.some((m) => m.id === selectedId && m.remaining > 0)
      ? selectedId
      : undefined,
  );
  const [query, setQuery] = useState("");
  const [competition, setCompetition] = useState("");
  const [limit, setLimit] = useState(PAGE);

  const competitions = useMemo(
    () =>
      [
        ...new Set(matches.map((m) => m.competition).filter(Boolean)),
      ].sort() as string[],
    [matches],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return matches.filter((m) => {
      if (competition && m.competition !== competition) return false;
      if (!q) return true;
      return (
        displayTeam(m.team1).toLowerCase().includes(q) ||
        displayTeam(m.team2).toLowerCase().includes(q) ||
        (m.competition ?? "").toLowerCase().includes(q)
      );
    });
  }, [matches, query, competition]);

  const shown = filtered.slice(0, limit);
  const hidden = filtered.length - shown.length;

  const groups = useMemo(() => {
    const map = new Map<string, PickerMatch[]>();
    for (const m of shown) {
      const key = formatKickoffDay(toDate(m.kickoff));
      const list = map.get(key) ?? [];
      list.push(m);
      map.set(key, list);
    }
    return [...map.entries()];
  }, [shown]);

  const selected = matches.find((m) => m.id === chosen);

  if (selected) {
    return (
      <div className="rounded-2xl border border-brand/40 bg-brand/5 p-5">
        <input type="hidden" name={name} value={selected.id} />
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <Badge tone="brand">{selected.competition ?? "Fixture"}</Badge>
            <p className="mt-2 text-lg font-semibold">
              {displayTeam(selected.team1)}{" "}
              <span className="text-muted">vs</span>{" "}
              {displayTeam(selected.team2)}
            </p>
            <p className="mt-1 text-sm text-muted">
              {formatKickoffDay(toDate(selected.kickoff))} ·{" "}
              {formatKickoffTime(toDate(selected.kickoff))}
            </p>
            <p className="mt-3 text-sm">
              <span className="text-lg font-semibold">
                {formatMoney(selected.priceMinor)}
              </span>{" "}
              <span className="text-muted">· {selected.remaining} left</span>
            </p>
          </div>
          <button
            type="button"
            onClick={() => setChosen(undefined)}
            className="rounded-xl border border-border bg-surface px-4 py-2 text-sm font-medium transition hover:bg-foreground/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
          >
            Change
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <input type="hidden" name={name} value="" />

      <div className="flex flex-wrap gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setLimit(PAGE);
          }}
          placeholder="Search a club, e.g. Arsenal"
          aria-label="Search fixtures by club"
          className={`${inputClass} min-w-[12rem] flex-1`}
        />
        {competitions.length > 1 && (
          <select
            value={competition}
            onChange={(e) => {
              setCompetition(e.target.value);
              setLimit(PAGE);
            }}
            aria-label="Filter by competition"
            className={`${inputClass} sm:w-56`}
          >
            <option value="">All competitions</option>
            {competitions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <p className="font-medium">No fixtures match</p>
          <p className="mt-1 text-sm text-muted">
            Try another club, or clear the competition filter.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map(([day, items]) => (
            <div key={day} className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">
                {day}
              </h3>
              {items.map((m) => {
                const soldOut = m.remaining <= 0;
                return (
                  <button
                    key={m.id}
                    type="button"
                    disabled={soldOut}
                    onClick={() => setChosen(m.id)}
                    className="lift block w-full rounded-2xl border border-border bg-surface p-4 text-left shadow-sm hover:border-brand/50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 disabled:cursor-not-allowed disabled:opacity-55 disabled:shadow-sm disabled:hover:border-border disabled:hover:shadow-sm"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold">
                          {displayTeam(m.team1)}{" "}
                          <span className="text-muted">vs</span>{" "}
                          {displayTeam(m.team2)}
                        </p>
                        <p className="mt-1 text-sm text-muted">
                          {formatKickoffTime(toDate(m.kickoff))}
                          {m.competition ? ` · ${m.competition}` : ""}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-semibold">
                          {formatMoney(m.priceMinor)}
                        </p>
                        <p
                          className={`text-xs ${soldOut ? "text-red-500" : "text-brand-strong"}`}
                        >
                          {soldOut ? "sold out" : `${m.remaining} left`}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {hidden > 0 && (
        <button
          type="button"
          onClick={() => setLimit((n) => n + PAGE * 2)}
          className="w-full rounded-xl border border-border py-2.5 text-sm font-medium transition hover:bg-foreground/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
        >
          Show {Math.min(hidden, PAGE * 2)} more
          <span className="text-muted"> · {hidden} not shown</span>
        </button>
      )}
    </div>
  );
}
