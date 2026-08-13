import { Card, inputClass } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { requireStaff } from "@/lib/session";
import { getCompetitionAdminList } from "@/lib/queries";
import {
  addCompetition,
  syncOneCompetition,
  syncSchedule,
  toggleCompetition,
} from "@/app/backoffice/actions";
import { formatKickoff } from "@/lib/format";

export const dynamic = "force-dynamic";

const cell = "px-3 py-2.5 align-top";

export default async function CompetitionsPage() {
  await requireStaff();
  const rows = await getCompetitionAdminList();

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Competitions</h1>
          <p className="text-sm text-muted">
            Data sources for the schedule. Sync pulls real fixtures from
            openfootball — a competition only appears once its season is
            published. <strong className="text-foreground">Upcoming = 0</strong>{" "}
            means there&apos;s no future data yet.
          </p>
        </div>
        <form action={syncSchedule}>
          <SubmitButton pendingText="Syncing…">Sync all active</SubmitButton>
        </form>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-muted">No competitions yet — add one below.</p>
      ) : (
        <Card className="!p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-foreground/5 text-left text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className={cell}>Competition</th>
                  <th className={cell}>Source</th>
                  <th className={cell}>Last synced</th>
                  <th className={`${cell} text-center`}>Fixtures</th>
                  <th className={`${cell} text-center`}>Upcoming</th>
                  <th className={cell}></th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ competition: c, total, upcoming }) => (
                  <tr key={c.id} className="border-t border-border">
                    <td className={cell}>
                      <div className="font-medium">{c.name}</div>
                      <div className="text-xs text-muted">
                        {c.code}
                        {!c.active && " · inactive"}
                      </div>
                    </td>
                    <td className={`${cell} text-xs text-muted`}>
                      {c.repo}/{c.season}/{c.file} ({c.sourceKind})
                    </td>
                    <td className={`${cell} text-xs text-muted`}>
                      {c.lastSyncedAt ? formatKickoff(c.lastSyncedAt) : "never"}
                    </td>
                    <td className={`${cell} text-center`}>{total}</td>
                    <td className={`${cell} text-center`}>
                      <span className={upcoming > 0 ? "text-brand-strong" : "text-red-500"}>
                        {upcoming}
                      </span>
                    </td>
                    <td className={`${cell}`}>
                      <div className="flex gap-2">
                        <form action={syncOneCompetition}>
                          <input type="hidden" name="id" value={c.id} />
                          <SubmitButton variant="ghost" pendingText="…">
                            Sync
                          </SubmitButton>
                        </form>
                        <form action={toggleCompetition}>
                          <input type="hidden" name="id" value={c.id} />
                          <SubmitButton variant="ghost" pendingText="…">
                            {c.active ? "Disable" : "Enable"}
                          </SubmitButton>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Card>
        <h2 className="font-semibold">Add a competition</h2>
        <p className="mt-1 text-sm text-muted">
          Point it at an openfootball source. Text repos (e.g.{" "}
          <code>england</code>, <code>champions-league</code>) usually have the
          newest data; use <code>football.json</code> for the JSON leagues.
        </p>
        <form action={addCompetition} className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-medium text-muted">
            Name
            <input name="name" placeholder="Champions League" required className={`mt-1 ${inputClass}`} />
          </label>
          <label className="text-xs font-medium text-muted">
            Code (ext-id prefix)
            <input name="code" placeholder="ucl" required className={`mt-1 ${inputClass}`} />
          </label>
          <label className="text-xs font-medium text-muted">
            Source kind
            <select name="sourceKind" defaultValue="txt" className={`mt-1 ${inputClass}`}>
              <option value="txt">txt (openfootball text repo)</option>
              <option value="json">json (football.json)</option>
            </select>
          </label>
          <label className="text-xs font-medium text-muted">
            Repo
            <input name="repo" placeholder="champions-league" required className={`mt-1 ${inputClass}`} />
          </label>
          <label className="text-xs font-medium text-muted">
            Season
            <input name="season" placeholder="2026-27" required className={`mt-1 ${inputClass}`} />
          </label>
          <label className="text-xs font-medium text-muted">
            File
            <input name="file" placeholder="cl.txt" required className={`mt-1 ${inputClass}`} />
          </label>
          <div className="sm:col-span-2">
            <SubmitButton pendingText="Adding…">Add competition</SubmitButton>
          </div>
        </form>
      </Card>
    </div>
  );
}
