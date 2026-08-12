import { randomBytes, randomUUID } from "node:crypto";

// Crockford base32 alphabet (no I, L, O, U) — easy to read aloud over the phone.
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

// An 8-character check-in code, e.g. "7F3KQ2MX".
export function generateCheckInCode(length = 8): string {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return out;
}

export function generateQrToken(): string {
  return randomUUID();
}

export function normalizeCheckInCode(input: string): string {
  return input.trim().toUpperCase().replace(/[^0-9A-Z]/g, "");
}
