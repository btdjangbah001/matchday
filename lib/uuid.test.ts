import { describe, expect, it } from "vitest";
import { isUuid } from "@/lib/uuid";

describe("isUuid", () => {
  it("accepts a canonical v4 UUID", () => {
    expect(isUuid("11111111-2222-3333-4444-555555555555")).toBe(true);
  });

  it("accepts upper-case hex", () => {
    expect(isUuid("AAAAAAAA-BBBB-CCCC-DDDD-EEEEEEEEEEEE")).toBe(true);
  });

  describe("rejects values that would reach Postgres as a bad uuid", () => {
    const rejected = [
      ["arbitrary path segment", "garbage"],
      ["empty string", ""],
      ["missing separators", "11111111222233334444555555555555"],
      ["too few groups", "11111111-2222-3333-4444"],
      ["non-hex characters", "zzzzzzzz-2222-3333-4444-555555555555"],
      ["wrong group length", "1111111-2222-3333-4444-555555555555"],
      ["trailing content", "11111111-2222-3333-4444-555555555555x"],
      ["sql fragment", "' OR 1=1 --"],
    ] as const;

    it.each(rejected)("rejects %s", (_label, value) => {
      expect(isUuid(value)).toBe(false);
    });
  });
});
