/**
 * Application ids and QR tokens arrive straight from the URL, so they may be any
 * string at all. Postgres raises "invalid input syntax for type uuid" when a
 * malformed value is compared against a uuid column, which surfaces as a 500
 * instead of the 404 the route intends. Screening the shape before the query
 * keeps every caller honest — an unparseable id simply does not exist.
 *
 * Kept in its own module (rather than in lib/queries.ts) so it carries no
 * "server-only" constraint and stays directly unit-testable. See DEF-002.
 */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}
