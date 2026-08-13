import { CURRENCY } from "@/lib/constants";

/** Format minor units (pesewas) as a GHS amount, e.g. 5000 -> "GHS 50.00". */
export function formatMoney(amountMinor: number): string {
  return `${CURRENCY} ${(amountMinor / 100).toFixed(2)}`;
}

/**
 * Knockout fixtures use placeholder codes until teams are decided
 * (openfootball: "W74" = winner of match 74, "2A" = runner-up of Group A,
 * "3A/B/C/D/F" = a third-placed team). Render them human-readably.
 */
export function displayTeam(name: string): string {
  let m = /^([WL])(\d+)$/.exec(name);
  if (m) return `${m[1] === "W" ? "Winner" : "Loser"} of match ${m[2]}`;

  m = /^([123])([A-Z])$/.exec(name);
  if (m) {
    const pos = m[1] === "1" ? "Winner" : m[1] === "2" ? "Runner-up" : "3rd";
    return `${pos} Group ${m[2]}`;
  }

  m = /^3([A-Z](?:\/[A-Z])+)$/.exec(name);
  if (m) return `3rd place (Group ${m[1]})`;

  return name;
}

export function fixtureTitle(team1: string, team2: string): string {
  return `${displayTeam(team1)} vs ${displayTeam(team2)}`;
}

export function scopeTitle(
  match: { team1: string; team2: string } | null,
  season: { name: string } | null,
): string {
  if (match) return fixtureTitle(match.team1, match.team2);
  if (season) return `${season.name} season`;
  return "Booking";
}

export function scopeSubtitle(
  match: { competition: string | null; kickoff: Date | null } | null,
  season: { startsAt: Date; endsAt: Date } | null,
): string {
  if (match) {
    return [match.competition, formatKickoff(match.kickoff)]
      .filter(Boolean)
      .join(" · ");
  }
  if (season) {
    return `All screenings · ${formatKickoff(season.startsAt)} to ${formatKickoff(season.endsAt)}`;
  }
  return "";
}

export function formatKickoffDay(kickoff: Date | null): string {
  if (!kickoff) return "Date TBD";
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(kickoff);
}

export function formatKickoffTime(kickoff: Date | null): string {
  if (!kickoff) return "Time TBD";
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(kickoff);
}

export function formatKickoff(kickoff: Date | null): string {
  if (!kickoff) return "Date TBD";
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(kickoff);
}
