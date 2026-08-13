import { describe, expect, it } from "vitest";
import {
  displayTeam,
  fixtureTitle,
  formatKickoff,
  formatMoney,
} from "@/lib/format";

describe("formatMoney", () => {
  it("renders minor units as a GHS amount", () => {
    expect(formatMoney(5000)).toBe("GHS 50.00");
  });

  it("keeps two decimal places for whole and part amounts", () => {
    expect(formatMoney(100)).toBe("GHS 1.00");
    expect(formatMoney(105)).toBe("GHS 1.05");
    expect(formatMoney(0)).toBe("GHS 0.00");
  });

  it("does not lose precision on amounts with odd pesewas", () => {
    expect(formatMoney(12345)).toBe("GHS 123.45");
  });
});

// Knockout fixtures arrive from openfootball with placeholder codes before the
// teams are known. Rendering "W74" to a customer is meaningless, so these are
// expanded to readable text.
describe("displayTeam", () => {
  it("expands winner and loser placeholders", () => {
    expect(displayTeam("W74")).toBe("Winner of match 74");
    expect(displayTeam("L8")).toBe("Loser of match 8");
  });

  it("expands group position placeholders", () => {
    expect(displayTeam("1A")).toBe("Winner Group A");
    expect(displayTeam("2A")).toBe("Runner-up Group A");
    expect(displayTeam("3C")).toBe("3rd Group C");
  });

  it("expands multi-group third-place placeholders", () => {
    expect(displayTeam("3A/B/C")).toBe("3rd place (Group A/B/C)");
  });

  it("passes real club names through untouched", () => {
    expect(displayTeam("Arsenal FC")).toBe("Arsenal FC");
    expect(displayTeam("Real Madrid")).toBe("Real Madrid");
  });

  it("does not mangle club names that merely contain digits", () => {
    expect(displayTeam("Schalke 04")).toBe("Schalke 04");
  });
});

describe("fixtureTitle", () => {
  it("joins both sides, expanding placeholders on each", () => {
    expect(fixtureTitle("Arsenal FC", "Chelsea FC")).toBe(
      "Arsenal FC vs Chelsea FC",
    );
    expect(fixtureTitle("W74", "2A")).toBe(
      "Winner of match 74 vs Runner-up Group A",
    );
  });
});

describe("formatKickoff", () => {
  it("states the date is unknown rather than rendering an epoch", () => {
    expect(formatKickoff(null)).toBe("Date TBD");
  });

  // Kickoffs are stored as UTC instants and always displayed in UTC so the
  // advertised time is the time shown, regardless of the viewer's device clock.
  it("formats a kickoff in UTC", () => {
    const result = formatKickoff(new Date("2026-09-16T19:00:00Z"));
    expect(result).toContain("16");
    expect(result).toContain("Sep");
    expect(result).toContain("19:00");
  });

  it("does not shift the day across a timezone boundary", () => {
    const lateNight = formatKickoff(new Date("2026-09-16T23:30:00Z"));
    expect(lateNight).toContain("16");
    expect(lateNight).toContain("23:30");
  });
});
