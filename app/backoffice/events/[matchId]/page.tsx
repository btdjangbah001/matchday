import { notFound } from "next/navigation";
import { Card, LinkButton, StatusPill } from "@/components/ui";
import { requireStaff } from "@/lib/session";
import { getMatchAttendees } from "@/lib/queries";
import { fixtureTitle, formatKickoff, formatMoney } from "@/lib/format";
import { TICKET_TYPE_LABELS } from "@/lib/constants";
import type { Application, TicketType } from "@/db/schema";

export const dynamic = "force-dynamic";

const TYPES: TicketType[] = ["seat", "parking", "vendor"];

function attendeeName(a: Application): string {
  const full = [a.firstName, a.lastName].filter(Boolean).join(" ");
  return full || a.phone;
}

function attendeeExtra(a: Application): string {
  if (a.type === "vendor") return a.vendorType ?? "";
  if (a.type === "parking") return a.carRegistration ?? "";
  return "";
}

export default async function EventPage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  await requireStaff();
  const { matchId } = await params;
  const id = Number(matchId);
  if (!Number.isInteger(id)) notFound();

  const data = await getMatchAttendees(id);
  if (!data) notFound();
  const { match, attendees } = data;

  const revenueMinor = attendees.reduce((s, a) => s + a.amountMinor, 0);

  return (
    <div className="space-y-6">
      <div>
        <LinkButton href="/backoffice/reports" variant="ghost">
          ← Reports
        </LinkButton>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {fixtureTitle(match.team1, match.team2)}
        </h1>
        <p className="text-sm text-muted">
          {formatKickoff(match.kickoff)}
          {match.venue ? ` · ${match.venue}` : ""}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-2xl font-bold">{attendees.length}</p>
          <p className="text-sm text-muted">Confirmed attendees</p>
        </Card>
        <Card>
          <p className="text-2xl font-bold">
            {attendees.filter((a) => a.status === "checked_in").length}
          </p>
          <p className="text-sm text-muted">Checked in</p>
        </Card>
        <Card className="bg-brand/5">
          <p className="text-2xl font-bold text-brand-strong">
            {formatMoney(revenueMinor)}
          </p>
          <p className="text-sm text-muted">Revenue</p>
        </Card>
      </div>

      {attendees.length === 0 ? (
        <p className="text-sm text-muted">No confirmed attendees yet.</p>
      ) : (
        TYPES.map((type) => {
          const group = attendees.filter((a) => a.type === type);
          if (group.length === 0) return null;
          return (
            <div key={type}>
              <h2 className="mb-2 font-semibold">
                {TICKET_TYPE_LABELS[type]}{" "}
                <span className="text-muted">({group.length})</span>
              </h2>
              <Card className="!p-0 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-foreground/5 text-left text-xs uppercase tracking-wide text-muted">
                      <tr>
                        <th className="px-4 py-2.5 font-medium">Name</th>
                        <th className="px-3 py-2.5 font-medium">Phone</th>
                        <th className="px-3 py-2.5 font-medium">Details</th>
                        <th className="px-3 py-2.5 font-medium">Code</th>
                        <th className="px-4 py-2.5 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.map((a) => (
                        <tr key={a.id} className="border-t border-border">
                          <td className="px-4 py-2.5 font-medium">
                            {attendeeName(a)}
                          </td>
                          <td className="px-3 py-2.5 text-muted">{a.phone}</td>
                          <td className="px-3 py-2.5 text-muted">
                            {attendeeExtra(a)}
                          </td>
                          <td className="px-3 py-2.5 font-mono text-xs">
                            {a.checkInCode}
                          </td>
                          <td className="px-4 py-2.5">
                            <StatusPill status={a.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          );
        })
      )}
    </div>
  );
}
