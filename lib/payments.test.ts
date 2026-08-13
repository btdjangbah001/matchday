import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getPaymentProvider, isMockPayments } from "@/lib/payments";
import { getSmsSender } from "@/lib/sms";

const original = { ...process.env };
beforeEach(() => {
  process.env = { ...original };
});
afterEach(() => {
  vi.unstubAllEnvs();
});
afterAll(() => {
  process.env = { ...original };
});

describe("getPaymentProvider", () => {
  it("returns the named provider", () => {
    process.env.PAYMENTS_PROVIDER = "mock";
    expect(getPaymentProvider().name).toBe("mock");
  });

  it("rejects a provider that no longer exists", () => {
    process.env.PAYMENTS_PROVIDER = "eganow";
    expect(() => getPaymentProvider()).toThrow(/not a known payment provider/);
  });

  it("rejects a missing provider rather than guessing", () => {
    delete process.env.PAYMENTS_PROVIDER;
    expect(() => getPaymentProvider()).toThrow(/is not set/);
  });

  it("refuses the mock in production without an explicit opt-in", () => {
    process.env.PAYMENTS_PROVIDER = "mock";
    vi.stubEnv("NODE_ENV", "production");
    delete process.env.ALLOW_MOCK_PAYMENTS;
    expect(() => getPaymentProvider()).toThrow(/Refusing to use the mock/);
  });

  it("allows the mock in production when asked for by name", () => {
    process.env.PAYMENTS_PROVIDER = "mock";
    vi.stubEnv("NODE_ENV", "production");
    process.env.ALLOW_MOCK_PAYMENTS = "true";
    expect(getPaymentProvider().name).toBe("mock");
  });
});

describe("isMockPayments", () => {
  it("is true only for the mock provider", () => {
    process.env.PAYMENTS_PROVIDER = "mock";
    expect(isMockPayments()).toBe(true);
    process.env.PAYMENTS_PROVIDER = "techup";
    expect(isMockPayments()).toBe(false);
  });
});

describe("getSmsSender", () => {
  it("rejects an unknown provider rather than silently mocking", () => {
    process.env.SMS_PROVIDER = "twilio";
    expect(() => getSmsSender()).toThrow(/not a known SMS provider/);
  });

  it("rejects a missing provider", () => {
    delete process.env.SMS_PROVIDER;
    expect(() => getSmsSender()).toThrow(/is not set/);
  });
});
