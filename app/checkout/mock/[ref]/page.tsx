import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { applications, matches, payments } from "@/db/schema";
import { Card, PageShell } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { completeMockPayment, cancelMockPayment } from "@/app/checkout/actions";
import { formatMoney } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function MockCheckoutPage({
  params,
}: {
  params: Promise<{ ref: string }>;
}) {
  const { ref } = await params;

  const [row] = await db
    .select({ payment: payments, application: applications, match: matches })
    .from(payments)
    .innerJoin(applications, eq(payments.applicationId, applications.id))
    .innerJoin(matches, eq(applications.matchId, matches.id))
    .where(eq(payments.providerRef, ref))
    .limit(1);
  if (!row) notFound();

  return (
    <PageShell>
      <div className="mx-auto max-w-md">
        <p className="mb-2 text-center text-xs font-medium uppercase tracking-wide text-amber-600">
          Mock payment gateway (development)
        </p>
        <Card className="text-center">
          <p className="text-sm text-muted">
            {row.match.team1} vs {row.match.team2}
          </p>
          <p className="my-3 text-3xl font-bold">
            {formatMoney(row.payment.amountMinor)}
          </p>
          <p className="mb-6 text-sm text-muted">
            This stands in for the live payment checkout until keys are added.
          </p>

          <div className="space-y-3">
            <form action={completeMockPayment}>
              <input type="hidden" name="ref" value={ref} />
              <SubmitButton pendingText="Processing…" className="w-full">
                Pay now (simulate success)
              </SubmitButton>
            </form>
            <form action={cancelMockPayment}>
              <input type="hidden" name="ref" value={ref} />
              <SubmitButton
                variant="ghost"
                pendingText="Cancelling…"
                className="w-full"
              >
                Cancel
              </SubmitButton>
            </form>
          </div>
        </Card>
      </div>
    </PageShell>
  );
}
