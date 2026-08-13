const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Postgres raises on a malformed uuid comparison, which surfaces as a 500.
export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}
