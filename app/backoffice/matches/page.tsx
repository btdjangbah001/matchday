import { Card } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { requireStaff } from "@/lib/session";
import { getActiveCompetitionNames, getMatchesWithInventory } from "@/lib/queries";
import {
  applyInventoryToAll,
  saveInventory,
  syncSchedule,
} from "@/app/backoffice/actions";
import { fixtureTitle, formatKickoff } from "@/lib/format";
import { TICKET_TYPE_LABELS } from "@/lib/constants";
import { inputClass } from "@/components/ui";
import type { Inventory, TicketType } from "@/db/schema";

export const dynamic = "force-dynamic";

const TYPES: TicketType[] = ["seat", "parking", "vendor"];

const numInput =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/30";

function InventoryRow({
  matchId,
  type,
  existing,
}: {
  matchId: number;
  type: TicketType;
  existing?: Inventory;
}) {
  const remaining = existing ? existing.capacity - existing.sold : 0;
  return (
    <form
      action={saveInventory}
      className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-background/40 p-3"
    >
      <input type="hidden" name="matchId" value={matchId} />
      <input type="hidden" name="type" value={type} />
      <div className="w-20">
        <span className="text-sm font-semibold">{TICKET_TYPE_LABELS[type]}</span>
        {existing ? (
          <p className="text-xs text-muted">
            {remaining > 0 ? `${remaining} left` : "full"} · {existing.sold} sold
          </p>
        ) : (
          <p className="text-xs text-muted">not set up</p>
        )}
      </div>
      <label className="flex-1 min-w-[7rem] text-xs font-medium text-muted">
        Available spaces
        <input
          name="capacity"
          type="number"
          min="0"
          step="1"
          defaultValue={existing?.capacity ?? 0}
          className={`mt-1 ${numInput}`}
        />
      </label>
      <label className="flex-1 min-w-[7rem] text-xs font-medium text-muted">
        Price (GHS)
        <input
          name="price"
          type="number"
          min="0"
          step="0.01"
          defaultValue={existing ? existing.priceMinor / 100 : 0}
          className={`mt-1 ${numInput}`}
        />
      </label>
      <SubmitButton variant="ghost" pendingText="Saving…">
        Save
      </SubmitButton>
    </form>
  );
}

export default async function MatchesPage({
  searchParams,
}: {
  searchParams: Promise<{ competition?: string }>;
}) {
  await requireStaff();
  const { competition } = await searchParams;
  const [rows, competitionNames] = await Promise.all([
    getMatchesWithInventory({ competition }),
    getActiveCompetitionNames(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Matches & availability</h1>
          <p className="text-sm text-muted">
            Set how many spaces are on sale and the price for each fixture.
            Showing the next two weeks plus any fixture you&apos;ve already set up.
          </p>
        </div>
        <form action={syncSchedule}>
          <SubmitButton pendingText="Syncing…">Sync schedule</SubmitButton>
        </form>
      </div>

      <form method="get" className="flex flex-wrap items-end gap-3">
        <label className="text-xs font-medium text-muted">
          Competition
          <select
            name="competition"
            defaultValue={competition ?? ""}
            className={`mt-1 ${inputClass}`}
          >
            <option value="">All competitions</option>
            {competitionNames.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium hover:bg-foreground/5"
        >
          Filter
        </button>
      </form>

      <Card>
        <h2 className="font-semibold">Set defaults for the fixtures shown</h2>
        <p className="mt-1 text-sm text-muted">
          Apply the same price and number of spaces to the fixtures currently in
          scope (next 2 weeks{competition ? ` · ${competition}` : ""}). Leave a
          row&apos;s spaces blank to skip it. You can still override individual
          fixtures below — sold tickets are never affected.
        </p>
        <form action={applyInventoryToAll} className="mt-4 space-y-2">
          <input type="hidden" name="competition" value={competition ?? ""} />
          {TYPES.map((type) => (
            <div
              key={type}
              className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-background/40 p-3"
            >
              <span className="w-20 text-sm font-semibold">
                {TICKET_TYPE_LABELS[type]}
              </span>
              <label className="flex-1 min-w-[7rem] text-xs font-medium text-muted">
                Available spaces
                <input
                  name={`${type}_capacity`}
                  type="number"
                  min="0"
                  step="1"
                  placeholder="leave blank to skip"
                  className={`mt-1 ${numInput}`}
                />
              </label>
              <label className="flex-1 min-w-[7rem] text-xs font-medium text-muted">
                Price (GHS)
                <input
                  name={`${type}_price`}
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={0}
                  className={`mt-1 ${numInput}`}
                />
              </label>
            </div>
          ))}
          <SubmitButton pendingText="Applying…">
            Apply to fixtures shown
          </SubmitButton>
        </form>
      </Card>

      {rows.length === 0 ? (
        <p className="text-sm text-muted">
          No fixtures in scope. Click “Sync schedule” to import league fixtures,
          or widen the competition filter.
        </p>
      ) : (
        <ul className="space-y-4">
          {rows.map(({ match, inventory }) => (
            <li key={match.id}>
              <Card>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-semibold">
                    {fixtureTitle(match.team1, match.team2)}
                  </span>
                  <span className="text-sm text-muted">
                    {formatKickoff(match.kickoff)}
                  </span>
                </div>
                <p className="text-xs text-muted">
                  {[match.competition, match.round, match.venue]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                <div className="mt-3 space-y-2">
                  {TYPES.map((type) => (
                    <InventoryRow
                      key={type}
                      matchId={match.id}
                      type={type}
                      existing={inventory.find((i) => i.type === type)}
                    />
                  ))}
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
