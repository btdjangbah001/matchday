import { notFound, redirect } from "next/navigation";
import { Card, PageShell } from "@/components/ui";
import { PaymentConfirm } from "@/components/forms/PaymentConfirm";
import { getApplicationWithMatch } from "@/lib/queries";
import { formatMoney, scopeTitle } from "@/lib/format";

export const dynamic = "force-dynamic";

function maskPhone(phone: string): string {
  return phone.replace(/^(\+\d{3})\d+(\d{2})$/, "$1•••••$2");
}

export default async function ConfirmPaymentPage({
  params,
}: {
  params: Promise<{ applicationId: string }>;
}) {
  const { applicationId } = await params;
  const row = await getApplicationWithMatch(applicationId);
  if (!row) notFound();
  const { application: app, match, season } = row;

  if ((app.status === "paid" || app.status === "checked_in") && app.qrToken) {
    redirect(`/ticket/${app.qrToken}`);
  }
  if (app.status !== "awaiting_payment") {
    redirect(`/pay/${applicationId}`);
  }

  return (
    <PageShell>
      <h1 className="mb-1 text-3xl font-bold tracking-tight">Confirm payment</h1>
      <p className="mb-6 text-muted">
        {scopeTitle(match, season)}
      </p>
      <Card>
        <PaymentConfirm
          applicationId={applicationId}
          phone={maskPhone(app.phone)}
          amountLabel={formatMoney(app.amountMinor)}
        />
      </Card>
    </PageShell>
  );
}
