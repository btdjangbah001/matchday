import type { CSSProperties } from "react";
import Link from "next/link";
import {
  Badge,
  Card,
  Container,
  FixtureCard,
  LinkButton,
  SiteFooter,
  SiteHeader,
} from "@/components/ui";
import { getScreenedMatches } from "@/lib/queries";
import { displayTeam, formatKickoff, formatMoney } from "@/lib/format";
import type { Inventory, Match } from "@/db/schema";

export const dynamic = "force-dynamic";

function stagger(ms: number): CSSProperties {
  return { "--stagger": `${ms}ms` } as CSSProperties;
}

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

const STEPS = [
  {
    n: "1",
    title: "Pick a fixture",
    desc: "Choose the game you want to watch and your ticket type.",
  },
  {
    n: "2",
    title: "Verify your phone",
    desc: "A one-time code confirms it's you. There's no account to create.",
  },
  {
    n: "3",
    title: "Pay and get your pass",
    desc: "Pay by mobile money and get a QR pass to show at the gate.",
  },
];

function NextUpCard({
  match,
  inventory,
}: {
  match: Match;
  inventory: Inventory[];
}) {
  const minPrice = inventory.length
    ? Math.min(...inventory.map((i) => i.priceMinor))
    : 0;

  return (
    <Card className="rise" style={stagger(160)}>
      <div className="flex items-center justify-between gap-3">
        <Badge>Next up</Badge>
        <span className="text-xs text-muted">{formatKickoff(match.kickoff)}</span>
      </div>

      <p className="mt-3 text-xl font-semibold tracking-tight">
        {displayTeam(match.team1)} <span className="text-muted">vs</span>{" "}
        {displayTeam(match.team2)}
      </p>
      <p className="mt-1 text-sm text-muted">
        {match.competition ?? "Fixture"}
        {match.venue ? ` · ${match.venue}` : ""}
      </p>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <span className="text-sm text-muted">
          from{" "}
          <span className="font-semibold text-foreground">
            {formatMoney(minPrice)}
          </span>
        </span>
        <LinkButton href={`/apply/seat?match=${match.id}`}>Get a seat</LinkButton>
      </div>
    </Card>
  );
}

export default async function Home() {
  const matches = await getScreenedMatches(7);
  const featured = matches[0];
  const rest = matches.slice(1, 5);

  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader />

      <section className="hero-glow border-b border-border">
        <Container className="grid items-center gap-10 py-16 sm:py-20 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <div className="rise">
              <Badge>Live Football · Watch Centre</Badge>
            </div>
            <h1
              className="rise mt-4 max-w-2xl text-4xl font-bold tracking-tight sm:text-6xl"
              style={stagger(60)}
            >
              Watch the big games with the{" "}
              <span className="text-brand-strong">whole city</span>.
            </h1>
            <p
              className="rise mt-5 max-w-xl text-lg text-muted"
              style={stagger(100)}
            >
              Premier League, Champions League, La Liga and more on the big
              screen. Reserve a seat, grab parking, or apply to vend — verify
              your phone, pay, and get a QR pass to redeem at the gate.
            </p>
            <div
              className="rise mt-8 flex flex-wrap gap-3"
              style={stagger(140)}
            >
              <LinkButton href="/fixtures">Browse fixtures</LinkButton>
              <LinkButton href="/apply/vendor" variant="ghost">
                Become a vendor
              </LinkButton>
            </div>
          </div>

          {featured && (
            <NextUpCard match={featured.match} inventory={featured.inventory} />
          )}
        </Container>
      </section>

      <main className="flex-1">
        <Container className="py-14">
          <div className="grid gap-4 sm:grid-cols-3">
            {OPTIONS.map((o, i) => (
              <Link
                key={o.href}
                href={o.href}
                className="lift rise group rounded-2xl border border-border bg-surface p-6 shadow-sm hover:border-brand/50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                style={stagger(200 + i * 60)}
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

          <section className="mt-16">
            <h2 className="text-2xl font-bold tracking-tight">How it works</h2>
            <ol className="mt-6 grid gap-6 sm:grid-cols-3">
              {STEPS.map((s) => (
                <li key={s.n}>
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-brand/12 text-sm font-semibold text-brand-strong">
                    {s.n}
                  </span>
                  <h3 className="mt-3 font-semibold">{s.title}</h3>
                  <p className="mt-1 text-sm text-muted">{s.desc}</p>
                </li>
              ))}
            </ol>
          </section>

          <section className="mt-16">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
              <h2 className="text-2xl font-bold tracking-tight">What&apos;s on</h2>
              <Link
                href="/fixtures"
                className="rounded-lg text-sm font-medium text-brand-strong hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                All fixtures →
              </Link>
            </div>

            {rest.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted">
                No fixtures on sale yet — check back soon.
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {rest.map(({ match, inventory }) => (
                  <FixtureCard
                    key={match.id}
                    match={match}
                    inventory={inventory}
                    variant="compact"
                  />
                ))}
              </div>
            )}
          </section>
        </Container>
      </main>

      <SiteFooter />
    </div>
  );
}
