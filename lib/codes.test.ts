import { describe, expect, it } from "vitest";
import {
  generateCheckInCode,
  generateQrToken,
  normalizeCheckInCode,
} from "@/lib/codes";

const CROCKFORD = /^[0123456789ABCDEFGHJKMNPQRSTVWXYZ]+$/;

describe("generateCheckInCode", () => {
  it("returns eight characters by default", () => {
    expect(generateCheckInCode()).toHaveLength(8);
  });

  it("honours a requested length", () => {
    expect(generateCheckInCode(12)).toHaveLength(12);
  });

  it("only uses the ambiguity-free alphabet", () => {
    for (let i = 0; i < 200; i++) {
      expect(generateCheckInCode()).toMatch(CROCKFORD);
    }
  });

  it("never emits the visually ambiguous letters", () => {
    const sample = Array.from({ length: 200 }, () => generateCheckInCode()).join("");
    expect(sample).not.toMatch(/[ILOU]/);
  });

  it("does not collide across a large sample", () => {
    const codes = new Set(
      Array.from({ length: 5000 }, () => generateCheckInCode()),
    );
    expect(codes.size).toBe(5000);
  });
});

describe("generateQrToken", () => {
  it("returns a UUID", () => {
    expect(generateQrToken()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });

  it("is unique across a large sample", () => {
    const tokens = new Set(Array.from({ length: 5000 }, () => generateQrToken()));
    expect(tokens.size).toBe(5000);
  });
});

describe("normalizeCheckInCode", () => {
  it("upper-cases what staff type", () => {
    expect(normalizeCheckInCode("7f3kq2mx")).toBe("7F3KQ2MX");
  });

  it("tolerates surrounding whitespace", () => {
    expect(normalizeCheckInCode("  7F3KQ2MX  ")).toBe("7F3KQ2MX");
  });

  it("strips separators staff may add for readability", () => {
    expect(normalizeCheckInCode("7F3K-Q2MX")).toBe("7F3KQ2MX");
    expect(normalizeCheckInCode("7F3K Q2MX")).toBe("7F3KQ2MX");
  });

  it("round-trips a freshly generated code", () => {
    const code = generateCheckInCode();
    expect(normalizeCheckInCode(code.toLowerCase())).toBe(code);
  });
});
