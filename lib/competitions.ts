// Default competitions used to seed the `competitions` table on first setup.
// After that, competitions are managed by admins in the back office — this list
// is only the starting point. Only leagues with real current-season data are
// included; admins add others (e.g. the Champions League) once published.
export interface CompetitionSeed {
  code: string;
  name: string;
  sourceKind: "json" | "txt";
  repo: string;
  season: string;
  file: string;
}

export const DEFAULT_COMPETITIONS: CompetitionSeed[] = [
  { code: "en.1", name: "Premier League", sourceKind: "txt", repo: "england", season: "2026-27", file: "1-premierleague.txt" },
  { code: "es.1", name: "La Liga", sourceKind: "txt", repo: "espana", season: "2026-27", file: "1-liga.txt" },
  { code: "it.1", name: "Serie A", sourceKind: "txt", repo: "italy", season: "2026-27", file: "1-seriea.txt" },
  { code: "de.1", name: "Bundesliga", sourceKind: "txt", repo: "deutschland", season: "2026-27", file: "1-bundesliga.txt" },
];

/** Raw openfootball URL for a competition source. */
export function sourceUrl(repo: string, season: string, file: string): string {
  return `https://raw.githubusercontent.com/openfootball/${repo}/master/${season}/${file}`;
}
