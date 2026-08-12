import { Card, PageShell } from "@/components/ui";
import { SeatForm } from "@/components/forms/SeatForm";
import { getAvailableMatches } from "@/lib/queries";
import { fixtureTitle, formatKickoff, formatMoney } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function SeatPage({
  searchParams,
}: {
  searchParams: Promise<{ match?: string }>;
}) {
  const { match } = await searchParams;
  const selectedId = match ? Number(match) : undefined;
  const matches = await getAvailableMatches("seat");
  const options = matches.map((m) => ({
    value: m.id,
    label:
      `${m.competition ? m.competition + " · " : ""}${fixtureTitle(m.team1, m.team2)} — ${formatKickoff(m.kickoff)} · ${formatMoney(m.priceMinor)}` +
      (m.remaining > 0 ? ` · ${m.remaining} left` : " · sold out"),
    disabled: m.remaining <= 0,
  }));

  return (
    <PageShell>
      <span className="text-4xl">🎟️</span>
      <h1 className="mt-3 text-3xl font-bold tracking-tight">Get a seat</h1>
      <p className="mb-6 mt-2 text-muted">
        Pick a match and verify your phone. You&apos;ll pay to confirm your seat.
      </p>
      <Card>
        {options.length === 0 ? (
          <p className="text-sm text-muted">
            No matches are open for seat booking right now.
          </p>
        ) : (
          <SeatForm options={options} selectedId={selectedId} />
        )}
      </Card>
    </PageShell>
  );
}
