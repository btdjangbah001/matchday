import type { NextRequest } from "next/server";
import { markPaymentSucceeded, releaseInventory } from "@/lib/orders";
import { parseCallback } from "@/lib/techup";
import { db } from "@/db";
import { applications, payments } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  // Fail closed: the reference is the application id, which the customer knows.
  const secret = process.env.TECHUP_WEBHOOK_SECRET;
  if (!secret) {
    console.error(
      "[webhook] TECHUP_WEBHOOK_SECRET is not set — refusing all callbacks.",
    );
    return Response.json({ error: "misconfigured" }, { status: 500 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid json" }, { status: 400 });
  }

  const { reference, status } = parseCallback(body);
  if (!reference) {
    return Response.json({ error: "missing reference" }, { status: 400 });
  }

  if (status === "success") {
    const app = await markPaymentSucceeded(reference);
    return Response.json({ ok: true, fulfilled: Boolean(app) });
  }

  // Only the caller that wins the pending -> failed transition releases the unit.
  if (status === "failed") {
    const [payment] = await db
      .select()
      .from(payments)
      .where(eq(payments.providerRef, reference))
      .limit(1);
    if (payment) {
      const [transitioned] = await db
        .update(payments)
        .set({ status: "failed" })
        .where(and(eq(payments.id, payment.id), eq(payments.status, "pending")))
        .returning({ id: payments.id });

      if (transitioned) {
        const [app] = await db
          .select()
          .from(applications)
          .where(
            and(
              eq(applications.id, payment.applicationId),
              eq(applications.status, "awaiting_payment"),
            ),
          )
          .limit(1);
        if (app) await releaseInventory(app.matchId, app.type);
      }
    }
  }

  return Response.json({ ok: true, status });
}
