import { Card, PageShell } from "@/components/ui";
import { VendorForm } from "@/components/forms/VendorForm";
import { getAvailableSeasons } from "@/lib/queries";
import { formatKickoff, formatMoney } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function VendorPage({
  searchParams,
}: {
  searchParams: Promise<{ season?: string }>;
}) {
  const { season } = await searchParams;
  const selectedId = season ? Number(season) : undefined;
  const seasons = await getAvailableSeasons();
  const options = seasons.map((s) => ({
    value: s.id,
    label:
      `${s.name} — ${formatKickoff(s.startsAt)} to ${formatKickoff(s.endsAt)} · ${formatMoney(s.priceMinor)}` +
      (s.remaining > 0 ? ` · ${s.remaining} pitches left` : " · full"),
    disabled: s.remaining <= 0,
  }));

  return (
    <PageShell>
      <h1 className="text-3xl font-bold tracking-tight">
        Apply as a vendor
      </h1>
      <p className="mb-6 mt-2 text-muted">
        A pitch covers every screening we run for the whole season. Tell us
        about yourself and verify your phone — our team reviews every
        application, and once approved we&apos;ll text you a payment link.
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
