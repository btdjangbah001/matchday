import { notFound, redirect } from "next/navigation";
import { Card, PageShell, StatusPill } from "@/components/ui";
import { PayButton } from "@/components/forms/PayButton";
import { getApplicationWithMatch } from "@/lib/queries";
import { fixtureTitle, formatKickoff, formatMoney } from "@/lib/format";
import { TICKET_TYPE_LABELS } from "@/lib/constants";
import { isMockPayments } from "@/lib/payments";

export const dynamic = "force-dynamic";

export default async function PayPage({
  params,
}: {
  params: Promise<{ applicationId: string }>;
}) {
  const { applicationId } = await params;
  const row = await getApplicationWithMatch(applicationId);
  if (!row) notFound();
  const { application: app, match } = row;

  if (app.status === "pending_otp") redirect(`/verify/${applicationId}`);
  if ((app.status === "paid" || app.status === "checked_in") && app.qrToken) {
    redirect(`/ticket/${app.qrToken}`);
  }

  return (
    <PageShell>
      <h1 className="mb-1 text-3xl font-bold tracking-tight">
        {TICKET_TYPE_LABELS[app.type]} application
      </h1>
      <p className="mb-6 text-muted">
        {fixtureTitle(match.team1, match.team2)} · {formatKickoff(match.kickoff)}
      </p>

      {isMockPayments() && (
        <p className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
          <strong className="font-semibold">Demonstration mode.</strong> Payments
          are simulated — no money changes hands and no mobile-money prompt is
          sent. Any checkout you complete here will be treated as paid.
        </p>
      )}

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <span className="text-sm text-muted">Status</span>
          <StatusPill status={app.status} />
        </div>

        {app.status === "awaiting_review" && (
          <p className="text-sm">
            Thanks! Your vendor application is being reviewed. Once approved,
            we&apos;ll text you a payment link to secure your slot.
          </p>
        )}

        {app.status === "rejected" && (
          <p className="text-sm text-red-600 dark:text-red-400">
            Unfortunately this vendor application was not approved. Please
            contact the organisers if you have questions.
          </p>
        )}

        {(app.status === "awaiting_payment" || app.status === "approved") && (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-xl bg-foreground/5 px-4 py-3">
              <span className="text-sm">Amount due</span>
              <span className="text-xl font-bold">
                {formatMoney(app.amountMinor)}
              </span>
            </div>
            <PayButton
              applicationId={applicationId}
              label={`Pay ${formatMoney(app.amountMinor)}`}
            />
          </div>
        )}
      </Card>
    </PageShell>
  );
}
