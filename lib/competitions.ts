// Competitions we screen at the centre. Fixtures come from the public-domain
// openfootball project, which ships two formats we support via source adapters:
//   - "json": structured football.json (domestic top leagues)
//   - "txt" : openfootball's text DSL, in per-competition repos (e.g. the cups)
// Adding a competition is just another entry here.

export type CompetitionSource =
  | { kind: "json"; season: string; file: string }
  | { kind: "txt"; repo: string; season: string; file: string };

export interface Competition {
  /** Stable prefix for a fixture's ext_id, e.g. "en.1" or "ucl". */
  code: string;
  /** Display name shown to customers and staff. */
  name: string;
  source: CompetitionSource;
}

export const COMPETITIONS: Competition[] = [
  // --- Domestic top leagues (structured JSON) ---
  { code: "en.1", name: "Premier League", source: { kind: "json", season: "2025-26", file: "en.1.json" } },
  { code: "es.1", name: "La Liga", source: { kind: "json", season: "2025-26", file: "es.1.json" } },
  { code: "it.1", name: "Serie A", source: { kind: "json", season: "2025-26", file: "it.1.json" } },
  { code: "de.1", name: "Bundesliga", source: { kind: "json", season: "2025-26", file: "de.1.json" } },
  { code: "fr.1", name: "Ligue 1", source: { kind: "json", season: "2025-26", file: "fr.1.json" } },
  { code: "nl.1", name: "Eredivisie", source: { kind: "json", season: "2025-26", file: "nl.1.json" } },
  { code: "pt.1", name: "Primeira Liga", source: { kind: "json", season: "2025-26", file: "pt.1.json" } },

  // --- UEFA club competitions (openfootball text DSL) ---
  {
    code: "ucl",
    name: "Champions League",
    source: { kind: "txt", repo: "champions-league", season: "2025-26", file: "cl.txt" },
  },
];

export function sourceUrl(source: CompetitionSource): string {
  if (source.kind === "json") {
    return `https://raw.githubusercontent.com/openfootball/football.json/master/${source.season}/${source.file}`;
  }
  return `https://raw.githubusercontent.com/openfootball/${source.repo}/master/${source.season}/${source.file}`;
}
