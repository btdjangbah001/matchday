
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
    console.log(`\n📱 [SMS:mock] -> ${to}\n${message}\n`);
    return { ok: true };
  },
};

// Never throws: a failed send is logged and swallowed so it can't break the
// calling flow. Callers that must know check the returned ok flag.
const arkeselSmsSender: SmsSender = {
  async send(to, message, opts) {
    const apiKey = process.env.ARKESEL_API_KEY;
    if (!apiKey) {
      console.warn(`[SMS] ARKESEL_API_KEY missing. Skipping SMS to ${to}`);
      return { ok: false, error: "SMS not configured" };
    }

    // Arkesel sender ID max length is 11 characters.
    let senderId = opts?.senderId || process.env.ARKESEL_SENDER || "Matchday";
    if (senderId.length > 11) senderId = senderId.slice(0, 11);

    // Arkesel expects the international format without a leading "+".
    const recipient = to.replace(/^\+/, "");

    const url =
      `https://sms.arkesel.com/sms/api?action=send-sms` +
      `&api_key=${encodeURIComponent(apiKey)}` +
      `&to=${encodeURIComponent(recipient)}` +
      `&from=${encodeURIComponent(senderId)}` +
      `&sms=${encodeURIComponent(message)}`;

    try {
      const response = await fetch(url);
      const body = await response.text();
      if (!response.ok) {
        console.error(
          `[SMS] Failed to send to ${to}. Status: ${response.status}. Response: ${body}`,
        );
        return { ok: false, error: `Arkesel responded ${response.status}` };
      }
      console.log(`[SMS] Sent to ${to} via Arkesel. Response: ${body}`);
      return { ok: true };
    } catch (err) {
      console.error(`[SMS] Exception sending to ${to}:`, err);
      return { ok: false, error: "Network error sending SMS" };
    }
  },
};

export function getSmsSender(): SmsSender {
  return process.env.SMS_PROVIDER === "arkesel"
    ? arkeselSmsSender
    : mockSmsSender;
}

export async function sendSms(
  to: string,
  message: string,
  opts?: SendOptions,
): Promise<SmsResult> {
  return getSmsSender().send(to, message, opts);
}
