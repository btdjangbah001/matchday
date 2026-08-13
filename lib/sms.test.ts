import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sendSms } from "@/lib/sms";

const original = { ...process.env };

beforeEach(() => {
  process.env = { ...original, SMS_PROVIDER: "arkesel", ARKESEL_API_KEY: "k" };
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  process.env = { ...original };
});

function respond(status: number) {
  return new Response("body", { status });
}

async function runWithTimers<T>(promise: Promise<T>): Promise<T> {
  const settled = promise;
  await vi.runAllTimersAsync();
  return settled;
}

describe("arkesel send retries", () => {
  it("sends once when the gateway accepts it", async () => {
    const fetchMock = vi.fn(async () => respond(200));
    vi.stubGlobal("fetch", fetchMock);

    const result = await runWithTimers(sendSms("+233241234567", "hi"));

    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("retries a 500 and succeeds on a later attempt", async () => {
    let call = 0;
    const fetchMock = vi.fn(async () => respond(++call === 1 ? 500 : 200));
    vi.stubGlobal("fetch", fetchMock);

    const result = await runWithTimers(sendSms("+233241234567", "hi"));

    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("retries a rate limit", async () => {
    let call = 0;
    const fetchMock = vi.fn(async () => respond(++call === 1 ? 429 : 200));
    vi.stubGlobal("fetch", fetchMock);

    const result = await runWithTimers(sendSms("+233241234567", "hi"));

    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("retries a network failure", async () => {
    let call = 0;
    const fetchMock = vi.fn(async () => {
      if (++call === 1) throw new Error("socket hang up");
      return respond(200);
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await runWithTimers(sendSms("+233241234567", "hi"));

    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("gives up after three attempts", async () => {
    const fetchMock = vi.fn(async () => respond(503));
    vi.stubGlobal("fetch", fetchMock);

    const result = await runWithTimers(sendSms("+233241234567", "hi"));

    expect(result.ok).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("does not retry a bad request, which would fail identically", async () => {
    const fetchMock = vi.fn(async () => respond(400));
    vi.stubGlobal("fetch", fetchMock);

    const result = await runWithTimers(sendSms("+233241234567", "hi"));

    expect(result.ok).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not call the gateway at all without an API key", async () => {
    process.env.ARKESEL_API_KEY = "";
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await runWithTimers(sendSms("+233241234567", "hi"));

    expect(result.ok).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
