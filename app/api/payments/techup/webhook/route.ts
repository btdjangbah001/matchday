import type { NextRequest } from "next/server";
import { markPaymentSucceeded, releaseInventory } from "@/lib/orders";
import { parseCallback } from "@/lib/techup";
import { db } from "@/db";
import { applications, payments } from "@/db/schema";
import { and, eq } from "drizzle-orm";

// TechupStudio posts { data, callback: PaymentReadDto } here when a payment
// reaches a terminal state, forwarding the Authorization header we set on the
// callback. We verify that header, then fulfil on "Successful".
export async function POST(request: NextRequest) {
  // Fail closed. A missing secret is a deployment error, not permission to skip
  // the check — the callback reference is the application id, which the customer
  // already knows from their own /pay/{id} URL, so an unauthenticated endpoint
  // would let anyone self-issue a paid pass. See TD-01.
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

  // Failed / cancelled — mark the payment failed and release the held unit.
  // The release is tied to *winning* the pending -> failed transition, so if the
  // polling path observes the same failure the second caller updates no rows and
  // does not release a second time. See TD-03.
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
