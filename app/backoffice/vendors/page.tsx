import { Card, StatusPill } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { requireStaff } from "@/lib/session";
import { getReviewedVendors, getVendorsAwaitingReview } from "@/lib/queries";
import { approveVendor, rejectVendor } from "@/app/backoffice/actions";
import { vendorPaymentLink } from "@/lib/links";
import { ResendPaymentLink } from "@/components/forms/ResendPaymentLink";
import { formatMoney, scopeSubtitle, scopeTitle } from "@/lib/format";
import type { Application, Season } from "@/db/schema";

export const dynamic = "force-dynamic";

export default async function VendorsPage() {
  await requireStaff();
  const [pending, reviewed] = await Promise.all([
    getVendorsAwaitingReview(),
    getReviewedVendors(),
  ]);

  const groups = new Map<number, { season: Season | null; apps: Application[] }>();
  for (const { application, season } of reviewed) {
    const key = season?.id ?? 0;
    const g = groups.get(key) ?? { season, apps: [] };
    g.apps.push(application);
    groups.set(key, g);
  }

  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Vendor applications</h1>
          <p className="text-sm text-muted">
            Approve to text the applicant a payment link, or reject.
          </p>
        </div>

        {pending.length === 0 ? (
          <p className="text-sm text-muted">
            No vendor applications awaiting review.
          </p>
        ) : (
          <ul className="space-y-3">
            {pending.map(({ application: app, match, season }) => (
              <li key={app.id}>
                <Card>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="font-medium">
                        {app.firstName} {app.lastName}
                      </p>
                      <p className="text-sm text-muted">
                        {app.vendorType} · {app.phone}
                      </p>
                      <p className="mt-1 text-sm text-muted">
                        {scopeTitle(match, season)} ·{" "}
                        {scopeSubtitle(match, season)}
                      </p>
                      <p className="mt-1 text-sm text-muted">
                        Fee: {formatMoney(app.amountMinor)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <form action={approveVendor}>
                        <input type="hidden" name="applicationId" value={app.id} />
                        <SubmitButton pendingText="…">Approve</SubmitButton>
                      </form>
                      <form action={rejectVendor}>
                        <input type="hidden" name="applicationId" value={app.id} />
                        <SubmitButton variant="ghost" pendingText="…">
                          Reject
                        </SubmitButton>
                      </form>
                    </div>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Reviewed vendors by match</h2>
          <p className="text-sm text-muted">
            Every vendor you&apos;ve already approved or rejected, grouped by event.
          </p>
        </div>

        {groups.size === 0 ? (
          <p className="text-sm text-muted">No vendors reviewed yet.</p>
        ) : (
          <div className="space-y-4">
            {[...groups.values()].map(({ season, apps }) => (
              <Card key={season?.id ?? 0}>
                <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-semibold">
                    {scopeTitle(null, season)}
                  </span>
                  <span className="text-sm text-muted">
                    {scopeSubtitle(null, season)} · {apps.length} vendor
                    {apps.length === 1 ? "" : "s"}
                  </span>
                </div>
                <ul className="divide-y divide-border">
                  {apps.map((app) => (
                    <li key={app.id} className="py-2 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span>
                          <span className="font-medium">
                            {app.firstName} {app.lastName}
                          </span>{" "}
                          <span className="text-muted">
                            · {app.vendorType} · {app.phone}
                          </span>
                        </span>
                        <span className="flex items-center gap-3">
                          <span className="text-muted">
                            {formatMoney(app.amountMinor)}
                          </span>
                          <StatusPill status={app.status} />
                        </span>
                      </div>
                      {app.status === "awaiting_payment" && (
                        <ResendPaymentLink
                          applicationId={app.id}
                          link={vendorPaymentLink(app.id)}
                        />
                      )}
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
