import { describe, expect, it } from "vitest";
import { normalizePhone } from "@/lib/phone";

// Phone normalisation is the identity key for the whole system: OTPs are sent to
// it, the duplicate-application index is keyed on it, and customers sign in with
// it. If two spellings of one number normalise differently, a customer can book
// twice and then fail to find either booking.
describe("normalizePhone", () => {
  describe("accepts the formats Ghanaian users actually type", () => {
    const accepted: [string, string][] = [
      ["0241234567", "+233241234567"],
      ["233241234567", "+233241234567"],
      ["+233241234567", "+233241234567"],
      ["00233241234567", "+233241234567"],
      ["241234567", "+233241234567"],
      ["024 123 4567", "+233241234567"],
      ["024-123-4567", "+233241234567"],
      ["  0241234567  ", "+233241234567"],
    ];

    it.each(accepted)("normalises %s", (input, expected) => {
      expect(normalizePhone(input)).toBe(expected);
    });
  });

  it("maps every spelling of one number onto a single identity", () => {
    const spellings = [
      "0241234567",
      "+233241234567",
      "233241234567",
      "024 123 4567",
      "024-123-4567",
    ];
    const normalized = new Set(spellings.map(normalizePhone));
    expect(normalized.size).toBe(1);
  });

  describe("rejects input that is not a Ghana number", () => {
    const rejected = [
      ["empty string", ""],
      ["too short", "024123"],
      ["too long", "02412345678901"],
      ["non-Ghana country code", "+447700900000"],
      ["letters only", "not-a-phone"],
      ["nine digits starting with zero", "024123456"],
    ] as const;

    it.each(rejected)("rejects %s", (_label, input) => {
      expect(normalizePhone(input)).toBeNull();
    });
  });
});
