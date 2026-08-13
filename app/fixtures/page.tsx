import { FixtureCard, PageShell, inputClass } from "@/components/ui";
import { getActiveCompetitionNames, getFixtures } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function FixturesPage({
  searchParams,
}: {
  searchParams: Promise<{ competition?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const competition = sp.competition?.trim() || undefined;
  const q = sp.q?.trim() || undefined;
  const [fixtures, competitionNames] = await Promise.all([
    getFixtures({ competition, q }),
    getActiveCompetitionNames(),
  ]);

  return (
    <PageShell width="wide">
      <h1 className="text-3xl font-bold tracking-tight">Fixtures</h1>
      <p className="mb-6 mt-2 text-muted">
        Browse the upcoming schedule — filter by competition or search your club.
        Fixtures we&apos;re screening can be booked right away.
      </p>

      <form method="get" className="mb-6 flex flex-wrap items-end gap-3">
        <label className="flex-1 min-w-[12rem] text-xs font-medium text-muted">
          Search team
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder="e.g. Arsenal"
            className={`mt-1 ${inputClass}`}
          />
        </label>
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
          className="rounded-xl bg-brand px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-strong"
        >
          Filter
        </button>
      </form>

      {fixtures.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted">
          No fixtures match. Try another competition or team.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {fixtures.map(({ match, inventory }) => (
            <FixtureCard key={match.id} match={match} inventory={inventory} />
          ))}
        </div>
      )}
    </PageShell>
  );
}
