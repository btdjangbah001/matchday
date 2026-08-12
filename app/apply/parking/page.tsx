import { Card, PageShell } from "@/components/ui";
import { ParkingForm } from "@/components/forms/ParkingForm";
import { getAvailableMatches } from "@/lib/queries";
import { fixtureTitle, formatKickoff, formatMoney } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ParkingPage({
  searchParams,
}: {
  searchParams: Promise<{ match?: string }>;
}) {
  const { match } = await searchParams;
  const selectedId = match ? Number(match) : undefined;
  const matches = await getAvailableMatches("parking");
  const options = matches.map((m) => ({
    value: m.id,
    label:
      `${m.competition ? m.competition + " · " : ""}${fixtureTitle(m.team1, m.team2)} — ${formatKickoff(m.kickoff)} · ${formatMoney(m.priceMinor)}` +
      (m.remaining > 0 ? ` · ${m.remaining} left` : " · sold out"),
    disabled: m.remaining <= 0,
  }));

  return (
    <PageShell>
      <span className="text-4xl">🅿️</span>
      <h1 className="mt-3 text-3xl font-bold tracking-tight">Reserve parking</h1>
      <p className="mb-6 mt-2 text-muted">
        Pick a match, add your car registration, and verify your phone.
      </p>
      <Card>
        {options.length === 0 ? (
          <p className="text-sm text-muted">
            No matches are open for parking right now.
          </p>
        ) : (
          <ParkingForm options={options} selectedId={selectedId} />
        )}
      </Card>
    </PageShell>
  );
}
