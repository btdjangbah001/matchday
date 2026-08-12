import type { NextRequest } from "next/server";
import { markPaymentSucceeded } from "@/lib/orders";
import { getCollectionStatus, parseCallbackReference } from "@/lib/eganow";

// Eganow calls this when a collection completes. The callback body has no
// documented signature, so we only take the reference number from it and
// RE-VERIFY the status against Eganow's authenticated API before fulfilling.
// We always ack with 200 (logging the payload) so Eganow doesn't keep retrying;
// the confirm page's polling is the redundant path — whichever wins is fine.
export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type") || "";
  const rawBody = await request.text();
  console.log(`[eganow] webhook content-type=${contentType} body=${rawBody}`);

  let payload: unknown = {};
  try {
    if (contentType.includes("application/x-www-form-urlencoded")) {
      payload = Object.fromEntries(new URLSearchParams(rawBody));
    } else {
      payload = JSON.parse(rawBody);
    }
  } catch {
    // Last resort: try the other format before giving up.
    try {
      payload = Object.fromEntries(new URLSearchParams(rawBody));
    } catch {
      payload = {};
    }
  }

  const reference = parseCallbackReference(payload);
  console.log(`[eganow] webhook reference=${reference ?? "(none found)"}`);
  if (!reference) {
    return Response.json({ ok: true, note: "no reference found; confirm-page poll will reconcile" });
  }

  const status = await getCollectionStatus(reference);
  if (status === "success") {
    const app = await markPaymentSucceeded(reference);
    return Response.json({ ok: true, fulfilled: Boolean(app) });
  }
  return Response.json({ ok: true, status });
}
