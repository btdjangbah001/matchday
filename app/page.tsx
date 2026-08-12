import Link from "next/link";
import {
  Badge,
  Container,
  LinkButton,
  SiteFooter,
  SiteHeader,
} from "@/components/ui";
import { getScreenedMatches } from "@/lib/queries";
import { displayTeam, formatKickoff, formatMoney } from "@/lib/format";
import { TICKET_TYPE_LABELS } from "@/lib/constants";

export const dynamic = "force-dynamic";

const OPTIONS = [
  {
    href: "/apply/seat",
    title: "Get a seat",
    desc: "Reserve a seat to watch the match live at the venue.",
    emoji: "🎟️",
  },
  {
    href: "/apply/parking",
    title: "Reserve parking",
    desc: "Secure a parking space for your car on match day.",
    emoji: "🅿️",
  },
  {
    href: "/apply/vendor",
    title: "Apply as a vendor",
    desc: "Sell food, drinks or merchandise. Subject to approval.",
    emoji: "🛍️",
  },
];

export default async function Home() {
  const matches = await getScreenedMatches(8);

  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader />

      <section className="hero-glow border-b border-border">
        <Container className="py-16 sm:py-24">
          <Badge>Live Football · Watch Centre</Badge>
          <h1 className="mt-4 max-w-2xl text-4xl font-bold tracking-tight sm:text-6xl">
            Watch the big games with the{" "}
            <span className="text-brand-strong">whole city</span>.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-muted">
            Premier League, Champions League, La Liga and more on the big
            screen. Reserve a seat, grab parking, or apply to vend — verify your
            phone, pay, and get a QR pass to redeem at the gate.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <LinkButton href="/apply/seat">Get a seat</LinkButton>
            <LinkButton href="/apply/vendor" variant="ghost">
              Become a vendor
            </LinkButton>
          </div>
        </Container>
      </section>

      <main className="flex-1">
        <Container className="py-14">
          <div className="grid gap-4 sm:grid-cols-3">
            {OPTIONS.map((o) => (
              <Link
                key={o.href}
                href={o.href}
                className="group rounded-2xl border border-border bg-surface p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-brand/50 hover:shadow-md"
              >
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-brand/10 text-2xl">
                  {o.emoji}
                </div>
                <h2 className="mt-4 font-semibold group-hover:text-brand-strong">
                  {o.title}
                </h2>
                <p className="mt-1 text-sm text-muted">{o.desc}</p>
              </Link>
            ))}
          </div>

          <div className="mt-16 mb-6 flex items-end justify-between">
            <h2 className="text-2xl font-bold tracking-tight">
              Upcoming matches
            </h2>
            <span className="text-sm text-muted">{matches.length} open</span>
          </div>

          {matches.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted">
              No matches are open for booking yet. Check back soon.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {matches.map(({ match, inventory }) => (
                <div
                  key={match.id}
                  className="rounded-2xl border border-border bg-surface p-5 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-3">
                    <Badge tone="muted">
                      {match.competition || match.round || "Fixture"}
                    </Badge>
                    <span className="text-xs text-muted">
                      {formatKickoff(match.kickoff)}
                    </span>
                  </div>
                  <p className="mt-3 text-lg font-semibold">
                    {displayTeam(match.team1)}{" "}
                    <span className="text-muted">vs</span>{" "}
                    {displayTeam(match.team2)}
                  </p>
                  {match.venue && (
                    <p className="text-sm text-muted">📍 {match.venue}</p>
                  )}
                  <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
                    {inventory.map((inv) => {
                      const left = Math.max(inv.capacity - inv.sold, 0);
                      return (
                        <span
                          key={inv.id}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-foreground/5 px-2.5 py-1 text-xs"
                        >
                          <span className="font-medium">
                            {TICKET_TYPE_LABELS[inv.type]}
                          </span>
                          <span className="text-muted">
                            {formatMoney(inv.priceMinor)}
                          </span>
                          <span
                            className={
                              left > 0
                                ? "text-brand-strong"
                                : "text-red-500"
                            }
                          >
                            · {left > 0 ? `${left} left` : "sold out"}
                          </span>
                        </span>
                      );
                    })}
                  </div>
                  <div className="mt-4 flex gap-2">
                    <LinkButton
                      href={`/apply/seat?match=${match.id}`}
                      className="flex-1 !py-2 text-xs"
                    >
                      Get a seat
                    </LinkButton>
                    <LinkButton
                      href={`/apply/parking?match=${match.id}`}
                      variant="ghost"
                      className="flex-1 !py-2 text-xs"
                    >
                      Parking
                    </LinkButton>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Container>
      </main>

      <SiteFooter />
    </div>
  );
}
