import { Card, LinkButton, PageShell, StatusPill } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { requireCustomer } from "@/lib/customer-session";
import { getApplicationsByPhone } from "@/lib/queries";
import { logoutCustomer } from "@/app/account/actions";
import { fixtureTitle, formatKickoff, formatMoney } from "@/lib/format";
import { TICKET_TYPE_LABELS } from "@/lib/constants";

export const dynamic = "force-dynamic";

function maskPhone(phone: string): string {
  return phone.replace(/^(\+\d{3})\d+(\d{2})$/, "$1•••••$2");
}

export default async function AccountPage() {
  const phone = await requireCustomer();
  const rows = await getApplicationsByPhone(phone);

  return (
    <PageShell width="wide">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My tickets</h1>
          <p className="text-muted">Signed in as {maskPhone(phone)}</p>
        </div>
        <div className="flex gap-2">
          <LinkButton href="/apply/seat">Book more</LinkButton>
          <form action={logoutCustomer}>
            <SubmitButton variant="ghost">Sign out</SubmitButton>
          </form>
        </div>
      </div>

      {rows.length === 0 ? (
        <Card>
          <p className="text-muted">
            Nothing on this number yet.{" "}
            <a href="/apply/seat" className="text-brand-strong underline">
              Book a seat
            </a>{" "}
            to get started.
          </p>
        </Card>
      ) : (
        <ul className="space-y-3">
          {rows.map(({ application: app, match }) => {
            const paid = app.status === "paid" || app.status === "checked_in";
            return (
              <li key={app.id}>
                <Card className="flex flex-wrap items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">
                        {TICKET_TYPE_LABELS[app.type]}
                      </span>
                      <StatusPill status={app.status} />
                    </div>
                    <p className="mt-1 truncate text-sm">
                      {match.competition ? `${match.competition} · ` : ""}
                      {fixtureTitle(match.team1, match.team2)}
                    </p>
                    <p className="text-xs text-muted">
                      {formatKickoff(match.kickoff)} ·{" "}
                      {formatMoney(app.amountMinor)}
                      {app.checkInCode ? ` · code ${app.checkInCode}` : ""}
                    </p>
                  </div>
                  <div className="shrink-0">
                    {paid && app.qrToken ? (
                      <LinkButton href={`/ticket/${app.qrToken}`}>
                        View pass
                      </LinkButton>
                    ) : app.status === "awaiting_payment" ||
                      app.status === "approved" ? (
                      <LinkButton href={`/pay/${app.id}`}>
                        Complete payment
                      </LinkButton>
                    ) : app.status === "pending_otp" ? (
                      <LinkButton href={`/verify/${app.id}`} variant="ghost">
                        Verify phone
                      </LinkButton>
                    ) : (
                      <LinkButton href={`/pay/${app.id}`} variant="ghost">
                        View
                      </LinkButton>
                    )}
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </PageShell>
  );
}
