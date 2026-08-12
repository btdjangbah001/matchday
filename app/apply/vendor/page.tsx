import { Card, PageShell } from "@/components/ui";
import { VendorForm } from "@/components/forms/VendorForm";
import { getAvailableMatches } from "@/lib/queries";
import { fixtureTitle, formatKickoff, formatMoney } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function VendorPage({
  searchParams,
}: {
  searchParams: Promise<{ match?: string }>;
}) {
  const { match } = await searchParams;
  const selectedId = match ? Number(match) : undefined;
  const matches = await getAvailableMatches("vendor");
  const options = matches.map((m) => ({
    value: m.id,
    label:
      `${m.competition ? m.competition + " · " : ""}${fixtureTitle(m.team1, m.team2)} — ${formatKickoff(m.kickoff)} · ${formatMoney(m.priceMinor)} fee` +
      (m.remaining > 0 ? ` · ${m.remaining} slots` : " · full"),
    disabled: m.remaining <= 0,
  }));

  return (
    <PageShell>
      <span className="text-4xl">🛍️</span>
      <h1 className="mt-3 text-3xl font-bold tracking-tight">
        Apply as a vendor
      </h1>
      <p className="mb-6 mt-2 text-muted">
        Tell us about yourself and verify your phone. Our team reviews every
        application — once approved, we&apos;ll text you a payment link.
      </p>
      <Card>
        {options.length === 0 ? (
          <p className="text-sm text-muted">
            Vendor applications aren&apos;t open right now.
          </p>
        ) : (
          <VendorForm options={options} selectedId={selectedId} />
        )}
      </Card>
    </PageShell>
  );
}
