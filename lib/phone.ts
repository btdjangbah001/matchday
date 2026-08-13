// Normalize a Ghana phone number to E.164-ish "+233XXXXXXXXX".
// Accepts "0241234567", "233241234567", "+233241234567", with spaces/dashes.
export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/[^\d+]/g, "");
  let n = digits;
  if (n.startsWith("+")) n = n.slice(1);
  if (n.startsWith("00")) n = n.slice(2);

  if (n.startsWith("0") && n.length === 10) {
    n = "233" + n.slice(1);
  } else if (n.length === 9 && !n.startsWith("0")) {
    // Bare subscriber number, e.g. 241234567. A real subscriber number never
    // starts with 0 — without that guard a 10-digit number missing one digit
    // ("024123456") would be read as a bare number and silently normalise to
    // +233024123456, sending the OTP into the void. See DEF-001.
    n = "233" + n;
  }

  if (!/^233\d{9}$/.test(n)) return null;
  return "+" + n;
}
