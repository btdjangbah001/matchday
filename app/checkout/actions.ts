"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { applications, payments } from "@/db/schema";
import { markPaymentSucceeded, releaseForApplication } from "@/lib/orders";

// Simulate a successful payment in development. Mirrors what the real payment
// webhook does, so the rest of the flow is identical.
export async function completeMockPayment(formData: FormData): Promise<void> {
  const ref = String(formData.get("ref") ?? "");
  const app = await markPaymentSucceeded(ref);
  if (app?.qrToken) redirect(`/ticket/${app.qrToken}`);
  redirect("/");
}

// Simulate a cancelled/failed payment: release the held inventory and mark the
// payment failed so the applicant can retry.
export async function cancelMockPayment(formData: FormData): Promise<void> {
  const ref = String(formData.get("ref") ?? "");
  const [payment] = await db
    .select()
    .from(payments)
    .where(eq(payments.providerRef, ref))
    .limit(1);
  if (!payment) redirect("/");

  await db
    .update(payments)
    .set({ status: "failed" })
    .where(eq(payments.id, payment.id));

  const [app] = await db
    .select()
    .from(applications)
    .where(eq(applications.id, payment.applicationId))
    .limit(1);

  if (app && app.status !== "paid" && app.status !== "checked_in") {
    await releaseForApplication(app.id);
  }

  redirect(`/pay/${payment.applicationId}`);
}
