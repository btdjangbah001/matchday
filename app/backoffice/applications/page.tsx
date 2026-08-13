import { Card, StatusPill, inputClass } from "@/components/ui";
import { requireStaff } from "@/lib/session";
import { getApplicationsList } from "@/lib/queries";
import { formatMoney, scopeSubtitle, scopeTitle } from "@/lib/format";
import { TICKET_TYPE_LABELS } from "@/lib/constants";
import type { ApplicationStatus, TicketType } from "@/db/schema";

export const dynamic = "force-dynamic";

const TYPES: TicketType[] = ["seat", "parking", "vendor"];
const STATUSES: ApplicationStatus[] = [
  "pending_otp",
  "awaiting_review",
  "approved",
  "rejected",
  "awaiting_payment",
  "paid",
  "checked_in",
  "cancelled",
];

export default async function ApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string; status?: string }>;
}) {
  await requireStaff();
  const sp = await searchParams;

  const type = TYPES.includes(sp.type as TicketType)
    ? (sp.type as TicketType)
    : undefined;
  const status = STATUSES.includes(sp.status as ApplicationStatus)
    ? (sp.status as ApplicationStatus)
    : undefined;
  const q = sp.q?.trim() || undefined;

  const rows = await getApplicationsList({ type, status, q });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Applications</h1>
        <p className="text-sm text-muted">
          Everyone who applied. Search by name, phone or check-in code.
        </p>
      </div>

      <form method="get" className="flex flex-wrap items-end gap-3">
        <label className="flex-1 min-w-[12rem] text-xs font-medium text-muted">
          Search
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder="phone, name or code"
            className={`mt-1 ${inputClass}`}
          />
        </label>
        <label className="text-xs font-medium text-muted">
          Type
          <select name="type" defaultValue={type ?? ""} className={`mt-1 ${inputClass}`}>
            <option value="">All</option>
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {TICKET_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium text-muted">
          Status
          <select
            name="status"
            defaultValue={status ?? ""}
            className={`mt-1 ${inputClass}`}
          >
            <option value="">All</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="rounded-xl bg-brand px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-strong"
        >
          Filter
        </button>
      </form>

      {rows.length === 0 ? (
        <p className="text-sm text-muted">No applications match.</p>
      ) : (
        <Card className="!p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-foreground/5 text-left text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Applicant</th>
                  <th className="px-3 py-3 font-medium">Type</th>
                  <th className="px-3 py-3 font-medium">Match</th>
                  <th className="px-3 py-3 font-medium">Network</th>
                  <th className="px-3 py-3 text-right font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ application: a, match, season }) => (
                  <tr key={a.id} className="border-t border-border">
                    <td className="px-4 py-3">
                      <div className="font-medium">
                        {[a.firstName, a.lastName].filter(Boolean).join(" ") ||
                          a.phone}
                      </div>
                      <div className="text-xs text-muted">{a.phone}</div>
                    </td>
                    <td className="px-3 py-3">{TICKET_TYPE_LABELS[a.type]}</td>
                    <td className="px-3 py-3">
                      <div>{scopeTitle(match, season)}</div>
                      <div className="text-xs text-muted">
                        {scopeSubtitle(match, season)}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-muted">
                      {a.momoNetwork ?? "—"}
                    </td>
                    <td className="px-3 py-3 text-right">
                      {formatMoney(a.amountMinor)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill status={a.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      <p className="text-xs text-muted">Showing up to 200 most recent.</p>
    </div>
  );
}
