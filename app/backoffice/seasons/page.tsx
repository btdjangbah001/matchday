import { Card, StatusPill, inputClass } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { requireStaff } from "@/lib/session";
import { getSeasonAdminList } from "@/lib/queries";
import {
  addSeason,
  saveVendorPitch,
  toggleSeason,
} from "@/app/backoffice/actions";
import { formatKickoff, formatMoney } from "@/lib/format";

export const dynamic = "force-dynamic";

function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export default async function SeasonsPage() {
  await requireStaff();
  const rows = await getSeasonAdminList();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Seasons</h1>
        <p className="text-sm text-muted">
          Vendors buy a pitch for a whole season rather than a single fixture.
          Set the fee and how many pitches are on offer here — seats and parking
          are priced per match under Matches.
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-muted">No seasons yet — add one below.</p>
      ) : (
        <div className="space-y-4">
          {rows.map(({ season, inventory: inv, vendors, paidVendors }) => {
            const sold = inv?.sold ?? 0;
            const capacity = inv?.capacity ?? 0;
            return (
              <Card key={season.id}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-semibold">{season.name}</h2>
                      <StatusPill
                        status={season.active ? "approved" : "cancelled"}
                      />
                    </div>
                    <p className="mt-1 text-sm text-muted">
                      {formatKickoff(season.startsAt)} to{" "}
                      {formatKickoff(season.endsAt)}
                    </p>
                    <p className="mt-1 text-sm text-muted">
                      {vendors} application{vendors === 1 ? "" : "s"} ·{" "}
                      {paidVendors} paid ·{" "}
                      {capacity > 0
                        ? `${Math.max(capacity - sold, 0)} of ${capacity} pitches left`
                        : "no pitches on sale"}
                    </p>
                  </div>
                  <form action={toggleSeason}>
                    <input type="hidden" name="id" value={season.id} />
                    <input
                      type="hidden"
                      name="active"
                      value={String(season.active)}
                    />
                    <SubmitButton variant="ghost" pendingText="…">
                      {season.active ? "Deactivate" : "Activate"}
                    </SubmitButton>
                  </form>
                </div>

                <form
                  action={saveVendorPitch}
                  className="mt-5 flex flex-wrap items-end gap-3 border-t border-border pt-4"
                >
                  <input type="hidden" name="seasonId" value={season.id} />
                  <label className="text-xs font-medium text-muted">
                    Pitch fee (GHS)
                    <input
                      name="price"
                      type="number"
                      min="0"
                      step="0.01"
                      defaultValue={
                        inv ? (inv.priceMinor / 100).toFixed(2) : ""
                      }
                      placeholder="1500.00"
                      required
                      className={`mt-1 w-36 ${inputClass}`}
                    />
                  </label>
                  <label className="text-xs font-medium text-muted">
                    Pitches
                    <input
                      name="capacity"
                      type="number"
                      min="0"
                      step="1"
                      defaultValue={inv?.capacity ?? ""}
                      placeholder="20"
                      required
                      className={`mt-1 w-28 ${inputClass}`}
                    />
                  </label>
                  <SubmitButton pendingText="Saving…">
                    {inv ? "Update pitches" : "Put pitches on sale"}
                  </SubmitButton>
                  {inv ? (
                    <span className="text-xs text-muted">
                      Currently {formatMoney(inv.priceMinor)} · {sold} sold
                    </span>
                  ) : null}
                </form>
              </Card>
            );
          })}
        </div>
      )}

      <Card>
        <h2 className="font-semibold">Add a season</h2>
        <form
          action={addSeason}
          className="mt-4 flex flex-wrap items-end gap-3"
        >
          <label className="text-xs font-medium text-muted">
            Name
            <input
              name="name"
              placeholder="2026/27"
              required
              className={`mt-1 w-40 ${inputClass}`}
            />
          </label>
          <label className="text-xs font-medium text-muted">
            Starts
            <input
              name="startsAt"
              type="date"
              defaultValue={isoDay(new Date())}
              required
              className={`mt-1 ${inputClass}`}
            />
          </label>
          <label className="text-xs font-medium text-muted">
            Ends
            <input
              name="endsAt"
              type="date"
              required
              className={`mt-1 ${inputClass}`}
            />
          </label>
          <SubmitButton pendingText="Adding…">Add season</SubmitButton>
        </form>
      </Card>
    </div>
  );
}
