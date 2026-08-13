import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { Card, PageShell, StatusPill } from "@/components/ui";
import { getApplicationByQrToken } from "@/lib/queries";
import { scopeSubtitle, scopeTitle } from "@/lib/format";
import { TICKET_TYPE_LABELS } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function TicketPage({
  params,
}: {
  params: Promise<{ qrToken: string }>;
}) {
  const { qrToken } = await params;
  const row = await getApplicationByQrToken(qrToken);
  if (!row) notFound();
  const { application: app, match, season } = row;

  const qrDataUrl = await QRCode.toDataURL(qrToken, { width: 320, margin: 1 });

  return (
    <PageShell>
      <h1 className="mb-1 text-3xl font-bold tracking-tight">Your pass</h1>
      <p className="mb-6 text-muted">Show this at the gate to check in.</p>

      <Card className="overflow-hidden !p-0">
        <div className="flex items-center justify-between bg-brand px-6 py-4 text-white">
          <span className="font-semibold">{TICKET_TYPE_LABELS[app.type]} pass</span>
          <StatusPill status={app.status} />
        </div>

        <div className="p-6 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrDataUrl}
            alt="Check-in QR code"
            width={256}
            height={256}
            className="mx-auto h-60 w-60 rounded-xl border border-border bg-white p-2"
          />

          <div className="mt-5">
            <p className="text-xs uppercase tracking-wide text-muted">
              Check-in code
            </p>
            <p className="font-mono text-3xl font-bold tracking-[0.25em]">
              {app.checkInCode}
            </p>
          </div>

          <div className="mt-6 border-t border-border pt-4 text-sm">
            <p className="text-base font-semibold">
              {scopeTitle(match, season)}
            </p>
            <p className="text-muted">{scopeSubtitle(match, season)}</p>
            {match?.venue && <p className="text-muted">{match.venue}</p>}
            {app.type === "parking" && app.carRegistration && (
              <p className="mt-2">
                Car: <span className="font-medium">{app.carRegistration}</span>
              </p>
            )}
            {app.type === "vendor" && (
              <p className="mt-2 text-muted">
                {app.firstName} {app.lastName} · {app.vendorType}
              </p>
            )}
          </div>
        </div>
      </Card>
    </PageShell>
  );
}
