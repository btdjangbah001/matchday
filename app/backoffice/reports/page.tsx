import Link from "next/link";
import { Card } from "@/components/ui";
import { requireStaff } from "@/lib/session";
import {
  getApplicationPipeline,
  getMatchBreakdown,
  getRevenueReport,
} from "@/lib/queries";
import { fixtureTitle, formatKickoff, formatMoney } from "@/lib/format";
import { TICKET_TYPE_LABELS } from "@/lib/constants";
import type { TicketType } from "@/db/schema";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  await requireStaff();
  const [revenue, breakdown, pipeline] = await Promise.all([
    getRevenueReport(),
    getMatchBreakdown(),
    getApplicationPipeline(),
  ]);

  const funnel = [
    { label: "Verifying phone", value: pipeline.pendingOtp },
    { label: "Awaiting review", value: pipeline.awaitingReview },
    { label: "Awaiting payment", value: pipeline.awaitingPayment },
    { label: "Paid", value: pipeline.paid },
    { label: "Checked in", value: pipeline.checkedIn },
    { label: "Rejected", value: pipeline.rejected },
  ];

  const byType = new Map(revenue.byType.map((r) => [r.type, r]));
  const types: TicketType[] = ["seat", "parking", "vendor"];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
        <p className="text-sm text-muted">
          Revenue collected and who&apos;s coming to each event.
        </p>
      </div>

      {/* Revenue summary */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card className="bg-brand/5">
          <p className="text-3xl font-bold text-brand-strong">
            {formatMoney(revenue.totalMinor)}
          </p>
          <p className="mt-1 text-sm text-muted">Total collected</p>
        </Card>
        {types.map((t) => (
          <Card key={t}>
            <p className="text-2xl font-bold">
              {formatMoney(byType.get(t)?.revenueMinor ?? 0)}
            </p>
            <p className="mt-1 text-sm text-muted">
              {TICKET_TYPE_LABELS[t]} · {byType.get(t)?.count ?? 0} sold
            </p>
          </Card>
        ))}
      </div>

      {/* Application pipeline — useful even before any sales */}
      <div>
        <h2 className="mb-3 text-lg font-semibold">
          Applications ({pipeline.total})
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-6">
          {funnel.map((f) => (
            <Card key={f.label} className="!p-4">
              <p className="text-2xl font-bold">{f.value}</p>
              <p className="mt-1 text-xs text-muted">{f.label}</p>
            </Card>
          ))}
        </div>
      </div>

      {/* Per-event breakdown */}
      <div>
        <h2 className="mb-3 text-lg font-semibold">By event</h2>
        {breakdown.length === 0 ? (
          <p className="text-sm text-muted">No confirmed bookings yet.</p>
        ) : (
          <Card className="!p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-foreground/5 text-left text-xs uppercase tracking-wide text-muted">
                  <tr>
                    <th className="px-4 py-3 font-medium">Match</th>
                    <th className="px-3 py-3 text-center font-medium">Seats</th>
                    <th className="px-3 py-3 text-center font-medium">Parking</th>
                    <th className="px-3 py-3 text-center font-medium">Vendors</th>
                    <th className="px-3 py-3 text-center font-medium">Checked in</th>
                    <th className="px-4 py-3 text-right font-medium">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {breakdown.map((b) => (
                    <tr
                      key={b.match.id}
                      className="border-t border-border hover:bg-foreground/[0.03]"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/backoffice/events/${b.match.id}`}
                          className="font-medium hover:text-brand-strong"
                        >
                          {fixtureTitle(b.match.team1, b.match.team2)}
                        </Link>
                        <div className="text-xs text-muted">
                          {formatKickoff(b.match.kickoff)}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center">{b.seats}</td>
                      <td className="px-3 py-3 text-center">{b.parking}</td>
                      <td className="px-3 py-3 text-center">{b.vendors}</td>
                      <td className="px-3 py-3 text-center">{b.checkedIn}</td>
                      <td className="px-4 py-3 text-right font-medium">
                        {formatMoney(b.revenueMinor)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
        <p className="mt-2 text-xs text-muted">
          Click a match to see exactly who is coming.
        </p>
      </div>
    </div>
  );
}
