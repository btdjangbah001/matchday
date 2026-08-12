import { Card, LinkButton } from "@/components/ui";
import { requireStaff } from "@/lib/session";
import { getDashboardCounts } from "@/lib/queries";
import { formatMoney } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await requireStaff();
  const counts = await getDashboardCounts();

  const stats = [
    { label: "Revenue collected", value: formatMoney(counts.revenueMinor) },
    { label: "Vendors pending", value: counts.vendorsPending },
    { label: "Paid", value: counts.paid },
    { label: "Checked in", value: counts.checkedIn },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Welcome, {session.name}</h1>
        <p className="text-sm text-neutral-500">Here&apos;s today&apos;s snapshot.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <p className="text-3xl font-bold">{s.value}</p>
            <p className="mt-1 text-sm text-neutral-500">{s.label}</p>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <LinkButton href="/backoffice/reports">View reports</LinkButton>
        <LinkButton href="/backoffice/applications" variant="ghost">
          Browse applications
        </LinkButton>
        <LinkButton href="/backoffice/vendors" variant="ghost">
          Review vendors
        </LinkButton>
        <LinkButton href="/backoffice/checkin" variant="ghost">
          Check people in
        </LinkButton>
        <LinkButton href="/backoffice/matches" variant="ghost">
          Manage matches
        </LinkButton>
      </div>
    </div>
  );
}
