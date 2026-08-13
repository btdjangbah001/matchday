import { describe, expect, it } from "vitest";
import { parseOpenfootballText } from "@/lib/schedule";

// The openfootball text DSL is the upstream fixture source. It is whitespace
// significant, mixes league and cup formats, and carries scores for played
// matches. Everything the centre screens flows through this parser, so a
// regression here empties the fixture list site-wide.

describe("parseOpenfootballText", () => {
  it("parses a simple league matchday", () => {
    const result = parseOpenfootballText(`
= Premier League 2026/27

▪ Matchday 1

Tue Sep 16 2026
 20:00  Arsenal FC  v  Coventry City FC
`);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      round: "Matchday 1",
      date: "2026-09-16",
      time: "20:00",
      team1: "Arsenal FC",
      team2: "Coventry City FC",
    });
  });

  it("carries the round and date across following fixture lines", () => {
    const result = parseOpenfootballText(`
▪ Matchday 1

Tue Sep 16 2026
 20:00  Arsenal FC  v  Coventry City FC
 20:00  Chelsea FC  v  Everton FC
`);

    expect(result).toHaveLength(2);
    expect(result.every((m) => m.date === "2026-09-16")).toBe(true);
    expect(result.every((m) => m.round === "Matchday 1")).toBe(true);
  });

  it("strips the country code and score from cup fixtures", () => {
    const result = parseOpenfootballText(`
» Round of 16

Wed Sep 17 2026
  Athletic Club (ESP)  v Arsenal FC (ENG)  0-2 (0-0)
`);

    expect(result).toHaveLength(1);
    expect(result[0].team1).toBe("Athletic Club");
    expect(result[0].team2).toBe("Arsenal FC");
  });

  it("ignores comments, separators and blank lines", () => {
    const result = parseOpenfootballText(`
# a comment
= a heading

▪ Matchday 1

Tue Sep 16 2026
 20:00  Arsenal FC  v  Coventry City FC
`);

    expect(result).toHaveLength(1);
  });

  it("rolls the year forward when the season crosses into January", () => {
    const result = parseOpenfootballText(`
▪ Matchday 20

Sat Dec 26 2026
 15:00  Arsenal FC  v  Chelsea FC

Sat Jan 02
 15:00  Everton FC  v  Arsenal FC
`);

    expect(result).toHaveLength(2);
    expect(result[0].date).toBe("2026-12-26");
    // No explicit year on the January line — the parser must infer 2027, not 2026.
    expect(result[1].date).toBe("2027-01-02");
  });

  it("keeps fixtures that have no kickoff time", () => {
    const result = parseOpenfootballText(`
▪ Matchday 1

Tue Sep 16 2026
  Arsenal FC  v  Coventry City FC
`);

    expect(result).toHaveLength(1);
    expect(result[0].time).toBeNull();
  });

  it("preserves knockout placeholder codes for later expansion", () => {
    const result = parseOpenfootballText(`
» Semi-finals

Tue Sep 16 2026
 20:00  W74  v  W75
`);

    expect(result[0].team1).toBe("W74");
    expect(result[0].team2).toBe("W75");
  });

  it("returns nothing for empty input", () => {
    expect(parseOpenfootballText("")).toEqual([]);
  });

  it("ignores fixture lines that appear before any date", () => {
    const result = parseOpenfootballText(`
▪ Matchday 1

 20:00  Arsenal FC  v  Coventry City FC
`);

    expect(result).toEqual([]);
  });
});
