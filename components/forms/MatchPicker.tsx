"use client";

import { useMemo, useState } from "react";
import {
  displayTeam,
  formatKickoffDay,
  formatKickoffTime,
  formatMoney,
} from "@/lib/format";
import { inputClass } from "@/components/ui";

export interface PickerMatch {
  id: number;
  competition: string | null;
  team1: string;
  team2: string;
  kickoff: string | null;
  priceMinor: number;
  remaining: number;
}

const MAX_SHOWN = 60;

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

  const competitions = useMemo(
    () =>
      [...new Set(matches.map((m) => m.competition).filter(Boolean))].sort() as string[],
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

  const shown = filtered.slice(0, MAX_SHOWN);
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
      <div className="rounded-xl border border-brand/40 bg-brand/5 p-4">
        <input type="hidden" name={name} value={selected.id} />
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-semibold">
              {displayTeam(selected.team1)}{" "}
              <span className="text-muted">vs</span>{" "}
              {displayTeam(selected.team2)}
            </p>
            <p className="mt-1 text-sm text-muted">
              {selected.competition ? `${selected.competition} · ` : ""}
              {formatKickoffDay(toDate(selected.kickoff))} ·{" "}
              {formatKickoffTime(toDate(selected.kickoff))}
            </p>
            <p className="mt-1 text-sm">
              <span className="font-semibold">
                {formatMoney(selected.priceMinor)}
              </span>{" "}
              <span className="text-muted">
                · {selected.remaining} left
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={() => setChosen(undefined)}
            className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium transition hover:bg-foreground/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
          >
            Change
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <input type="hidden" name={name} value="" />
      <div className="flex flex-wrap gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search a club, e.g. Arsenal"
          aria-label="Search fixtures by club"
          className={`${inputClass} flex-1 min-w-[12rem]`}
        />
        {competitions.length > 1 && (
          <select
            value={competition}
            onChange={(e) => setCompetition(e.target.value)}
            aria-label="Filter by competition"
            className={`${inputClass} sm:w-52`}
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
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted">
          No fixtures match. Try another club or competition.
        </p>
      ) : (
        <div className="max-h-96 space-y-4 overflow-y-auto rounded-xl border border-border p-3">
          {groups.map(([day, items]) => (
            <div key={day}>
              <p className="sticky top-0 bg-surface py-1 text-xs font-semibold uppercase tracking-wider text-muted">
                {day}
              </p>
              <ul className="mt-1 space-y-1">
                {items.map((m) => {
                  const soldOut = m.remaining <= 0;
                  return (
                    <li key={m.id}>
                      <button
                        type="button"
                        disabled={soldOut}
                        onClick={() => setChosen(m.id)}
                        className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left transition hover:bg-foreground/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">
                            {displayTeam(m.team1)}{" "}
                            <span className="text-muted">vs</span>{" "}
                            {displayTeam(m.team2)}
                          </span>
                          <span className="block text-xs text-muted">
                            {formatKickoffTime(toDate(m.kickoff))}
                            {m.competition ? ` · ${m.competition}` : ""}
                          </span>
                        </span>
                        <span className="shrink-0 text-right">
                          <span className="block text-sm font-semibold">
                            {formatMoney(m.priceMinor)}
                          </span>
                          <span
                            className={`block text-xs ${soldOut ? "text-red-500" : "text-brand-strong"}`}
                          >
                            {soldOut ? "sold out" : `${m.remaining} left`}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}

      {hidden > 0 && (
        <p className="text-xs text-muted">
          Showing {shown.length} of {filtered.length}. Search to narrow it down.
        </p>
      )}
    </div>
  );
}
