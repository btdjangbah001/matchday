import { describe, expect, it } from "vitest";
import {
  otpInputSchema,
  parkingSchema,
  seatSchema,
  vendorSchema,
} from "@/lib/validation";

describe("seatSchema", () => {
  it("accepts a valid booking and normalises the phone", () => {
    const result = seatSchema.safeParse({
      matchId: "3",
      phone: "0241234567",
      network: "MTN",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.phone).toBe("+233241234567");
      expect(result.data.matchId).toBe(3);
    }
  });

  it("coerces the match id from the string a form submits", () => {
    const result = seatSchema.safeParse({
      matchId: "42",
      phone: "0241234567",
      network: "MTN",
    });
    expect(result.success && typeof result.data.matchId).toBe("number");
  });

  it("rejects a malformed phone number", () => {
    const result = seatSchema.safeParse({
      matchId: "3",
      phone: "12345",
      network: "MTN",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a network outside the supported list", () => {
    const result = seatSchema.safeParse({
      matchId: "3",
      phone: "0241234567",
      network: "BITCOIN",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a non-positive match id", () => {
    for (const matchId of ["0", "-1"]) {
      expect(
        seatSchema.safeParse({ matchId, phone: "0241234567", network: "MTN" })
          .success,
      ).toBe(false);
    }
  });

  it("rejects a missing phone", () => {
    expect(
      seatSchema.safeParse({ matchId: "3", phone: "", network: "MTN" }).success,
    ).toBe(false);
  });
});

describe("parkingSchema", () => {
  it("accepts a valid parking application", () => {
    const result = parkingSchema.safeParse({
      matchId: "3",
      carRegistration: "GR 1234-20",
      phone: "0241234567",
      network: "VODAFONE",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a car registration that is too short", () => {
    const result = parkingSchema.safeParse({
      matchId: "3",
      carRegistration: "A",
      phone: "0241234567",
      network: "VODAFONE",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an over-long car registration", () => {
    const result = parkingSchema.safeParse({
      matchId: "3",
      carRegistration: "X".repeat(21),
      phone: "0241234567",
      network: "VODAFONE",
    });
    expect(result.success).toBe(false);
  });
});

describe("vendorSchema", () => {
  it("accepts a complete vendor application", () => {
    const result = vendorSchema.safeParse({
      matchId: "3",
      firstName: "Ama",
      lastName: "Mensah",
      vendorType: "Food",
      phone: "0241234567",
      network: "AIRTELTIGO",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a vendor type outside the approved list", () => {
    const result = vendorSchema.safeParse({
      matchId: "3",
      firstName: "Ama",
      lastName: "Mensah",
      vendorType: "Fireworks",
      phone: "0241234567",
      network: "MTN",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a blank name that is only whitespace", () => {
    const result = vendorSchema.safeParse({
      matchId: "3",
      firstName: "   ",
      lastName: "Mensah",
      vendorType: "Food",
      phone: "0241234567",
      network: "MTN",
    });
    expect(result.success).toBe(false);
  });
});

describe("otpInputSchema", () => {
  it("accepts exactly six digits", () => {
    expect(otpInputSchema.safeParse("123456").success).toBe(true);
  });

  it("tolerates whitespace around the code", () => {
    const result = otpInputSchema.safeParse("  123456  ");
    expect(result.success && result.data).toBe("123456");
  });

  it("rejects codes of the wrong length or shape", () => {
    for (const bad of ["12345", "1234567", "12345a", "abcdef", ""]) {
      expect(otpInputSchema.safeParse(bad).success).toBe(false);
    }
  });
});
