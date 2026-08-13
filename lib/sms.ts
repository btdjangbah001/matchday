
export interface SendOptions {
  senderId?: string;
}

export interface SmsResult {
  ok: boolean;
  error?: string;
}

export interface SmsSender {
  send(to: string, message: string, opts?: SendOptions): Promise<SmsResult>;
}

const mockSmsSender: SmsSender = {
  async send(to, message) {
    console.log(`\n[SMS:mock] -> ${to}\n${message}\n`);
    return { ok: true };
  },
};

const SEND_ATTEMPTS = 3;
const BACKOFF_MS = [400, 1500];
const REQUEST_TIMEOUT_MS = 8000;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface Attempt {
  ok: boolean;
  retryable: boolean;
  error?: string;
}

async function arkeselAttempt(url: string, to: string): Promise<Attempt> {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const body = await response.text();

    if (response.ok) {
      console.log(`[SMS] Sent to ${to} via Arkesel. Response: ${body}`);
      return { ok: true, retryable: false };
    }

    // 429 and 5xx are worth another go; other 4xx will fail identically.
    const retryable = response.status === 429 || response.status >= 500;
    console.error(
      `[SMS] Arkesel responded ${response.status} for ${to}. Response: ${body}`,
    );
    return {
      ok: false,
      retryable,
      error: `Arkesel responded ${response.status}`,
    };
  } catch (err) {
    const timedOut = err instanceof Error && err.name === "TimeoutError";
    console.error(`[SMS] ${timedOut ? "Timed out" : "Exception"} sending to ${to}:`, err);
    return {
      ok: false,
      retryable: true,
      error: timedOut ? "SMS gateway timed out" : "Network error sending SMS",
    };
  }
}

// Never throws: a failed send is logged and swallowed so it can't break the
// calling flow. Callers that must know check the returned ok flag.
const arkeselSmsSender: SmsSender = {
  async send(to, message, opts) {
    const apiKey = process.env.ARKESEL_API_KEY;
    if (!apiKey) {
      console.warn(`[SMS] ARKESEL_API_KEY missing. Skipping SMS to ${to}`);
      return { ok: false, error: "SMS not configured" };
    }

    let senderId = opts?.senderId || process.env.ARKESEL_SENDER || "Matchday";
    if (senderId.length > 11) senderId = senderId.slice(0, 11);

    const recipient = to.replace(/^\+/, "");
    const url =
      `https://sms.arkesel.com/sms/api?action=send-sms` +
      `&api_key=${encodeURIComponent(apiKey)}` +
      `&to=${encodeURIComponent(recipient)}` +
      `&from=${encodeURIComponent(senderId)}` +
      `&sms=${encodeURIComponent(message)}`;

    let last: Attempt = { ok: false, retryable: false, error: "SMS not attempted" };

    for (let attempt = 1; attempt <= SEND_ATTEMPTS; attempt++) {
      last = await arkeselAttempt(url, to);
      if (last.ok) return { ok: true };
      if (!last.retryable) break;

      if (attempt < SEND_ATTEMPTS) {
        const delay = BACKOFF_MS[attempt - 1] ?? BACKOFF_MS[BACKOFF_MS.length - 1];
        console.warn(
          `[SMS] Retrying ${to} in ${delay}ms (attempt ${attempt + 1} of ${SEND_ATTEMPTS}).`,
        );
        await wait(delay);
      }
    }

    return { ok: false, error: last.error };
  },
};

const SMS_SENDERS: Record<string, SmsSender> = {
  mock: mockSmsSender,
  arkesel: arkeselSmsSender,
};

export function getSmsSender(): SmsSender {
  const name = process.env.SMS_PROVIDER;
  const known = Object.keys(SMS_SENDERS).join(", ");

  if (!name) {
    throw new Error(`SMS_PROVIDER is not set. Choose one of: ${known}.`);
  }

  const sender = SMS_SENDERS[name];
  if (!sender) {
    throw new Error(
      `SMS_PROVIDER is "${name}", which is not a known SMS provider. ` +
        `Choose one of: ${known}.`,
    );
  }

  return sender;
}

export async function sendSms(
  to: string,
  message: string,
  opts?: SendOptions,
): Promise<SmsResult> {
  return getSmsSender().send(to, message, opts);
}
