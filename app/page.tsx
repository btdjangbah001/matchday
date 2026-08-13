import type { CSSProperties } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Badge,
  Card,
  Container,
  FixtureCard,
  LinkButton,
  SiteFooter,
  SiteHeader,
} from "@/components/ui";
import { getScreenedMatches, getVenueStats } from "@/lib/queries";
import { displayTeam, formatKickoff, formatMoney } from "@/lib/format";
import { PHOTO_CREDITS, VENUE } from "@/lib/venue";
import { Icon } from "@/components/Icons";
import type { Inventory, Match } from "@/db/schema";

export const dynamic = "force-dynamic";

function stagger(ms: number): CSSProperties {
  return { "--stagger": `${ms}ms` } as CSSProperties;
}

const STEPS = [
  {
    n: "1",
    title: "Pick a fixture",
    desc: "Choose the game and whether you want a seat, a parking bay, or both.",
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
  const bookable = inventory.filter((i) => i.type !== "vendor");
  const minPrice = bookable.length
    ? Math.min(...bookable.map((i) => i.priceMinor))
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
  const [matches, stats] = await Promise.all([
    getScreenedMatches(7),
    getVenueStats(),
  ]);
  const featured = matches[0];
  const rest = matches.slice(1, 5);

  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader />

      <section className="hero-glow border-b border-border">
        <Container className="grid items-center gap-10 py-16 sm:py-20 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <div className="rise">
              <Badge>Live football · Watch centre</Badge>
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
              One big screen, a seat with your name on it, and parking sorted
              before you leave the house. Book by mobile money in under two
              minutes — no account needed.
            </p>
            <div className="rise mt-8 flex flex-wrap gap-3" style={stagger(140)}>
              <LinkButton href="/fixtures">Browse fixtures</LinkButton>
              <LinkButton href="#venue" variant="ghost">
                See the venue
              </LinkButton>
            </div>

            {stats.onSale > 0 && (
              <dl
                className="rise mt-10 flex flex-wrap gap-x-10 gap-y-4"
                style={stagger(180)}
              >
                <div>
                  <dt className="text-xs uppercase tracking-wider text-muted">
                    Fixtures on sale
                  </dt>
                  <dd className="text-2xl font-bold tracking-tight">
                    {stats.onSale}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wider text-muted">
                    Competitions
                  </dt>
                  <dd className="text-2xl font-bold tracking-tight">
                    {stats.competitions}
                  </dd>
                </div>
                {stats.seats > 0 && (
                  <div>
                    <dt className="text-xs uppercase tracking-wider text-muted">
                      Seats per screening
                    </dt>
                    <dd className="text-2xl font-bold tracking-tight">
                      {stats.seats}
                    </dd>
                  </div>
                )}
              </dl>
            )}
          </div>

          {featured && (
            <NextUpCard match={featured.match} inventory={featured.inventory} />
          )}
        </Container>
      </section>

      <main className="flex-1">
        <Container className="py-14">
          <section>
            <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">
                  What&apos;s on
                </h2>
                <p className="mt-1 text-sm text-muted">
                  Fixtures we&apos;re screening, on sale now.
                </p>
              </div>
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

          <section id="venue" className="mt-20 scroll-mt-20">
            <h2 className="text-2xl font-bold tracking-tight">
              What it&apos;s like
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-muted">
              A room built for watching football with other people, rather than
              a bar with a television in the corner.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="relative aspect-[3/2] overflow-hidden rounded-2xl border border-border sm:col-span-2 sm:aspect-[2/1]">
                <Image
                  src="/images/crowd-watching.jpg"
                  alt="A packed street café at night, every chair turned towards a screen showing a live football match"
                  fill
                  priority
                  sizes="(min-width: 640px) 66vw, 100vw"
                  className="object-cover"
                />
              </div>
              <div className="relative aspect-[3/2] overflow-hidden rounded-2xl border border-border sm:aspect-auto">
                <Image
                  src="/images/supporters.jpg"
                  alt="Three supporters in club shirts watching a match together"
                  fill
                  sizes="(min-width: 640px) 33vw, 100vw"
                  className="object-cover"
                />
              </div>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <div className="relative aspect-[16/9] overflow-hidden rounded-2xl border border-border sm:col-span-3 sm:aspect-[32/9]">
                <Image
                  src="/images/big-screen.jpg"
                  alt="A full auditorium of seated people, all facing one large screen"
                  fill
                  sizes="100vw"
                  className="object-cover"
                />
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {VENUE.facilities.map((f) => (
                <div
                  key={f.title}
                  className="rounded-2xl border border-border bg-surface p-5 shadow-sm"
                >
                  <Icon name={f.icon} className="h-6 w-6 text-brand-strong" />
                  <h3 className="mt-3 font-semibold">{f.title}</h3>
                  <p className="mt-1 text-sm text-muted">{f.body}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-20">
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

          {stats.vendor && (
            <section className="mt-20">
              <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
                <div className="grid gap-8 p-7 sm:grid-cols-[1.2fr_0.8fr] sm:p-9">
                  <div>
                    <Badge>Vendors · {stats.vendor.seasonName} season</Badge>
                    <h2 className="mt-3 text-2xl font-bold tracking-tight">
                      Sell to a full room, every screening
                    </h2>
                    <p className="mt-3 max-w-xl text-sm text-muted">
                      A pitch runs for the whole season, not one match — food,
                      drinks, merchandise or crafts. Every application is
                      reviewed before payment, so you know where you stand
                      before anything is charged.
                    </p>
                    <div className="mt-6 flex flex-wrap items-center gap-4">
                      <LinkButton href="/apply/vendor">
                        Apply for a pitch
                      </LinkButton>
                      <span className="text-sm text-muted">
                        {stats.vendor.remaining > 0
                          ? `${stats.vendor.remaining} pitches left`
                          : "Fully booked this season"}
                      </span>
                    </div>
                  </div>
                  <div className="sm:border-l sm:border-border sm:pl-8">
                    <p className="text-xs uppercase tracking-wider text-muted">
                      Season pitch
                    </p>
                    <p className="mt-1 text-3xl font-bold tracking-tight">
                      {formatMoney(stats.vendor.priceMinor)}
                    </p>
                    <p className="mt-1 text-sm text-muted">
                      One payment, every screening in {stats.vendor.seasonName}.
                    </p>
                  </div>
                </div>
              </div>
            </section>
          )}

          <section className="mt-20">
            <h2 className="text-2xl font-bold tracking-tight">Find us</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
                <h3 className="text-sm font-semibold">Where</h3>
                <address className="mt-2 text-sm not-italic text-muted">
                  {VENUE.addressLines.map((line) => (
                    <span key={line} className="block">
                      {line}
                    </span>
                  ))}
                </address>
                <a
                  href={VENUE.mapsUrl}
                  className="mt-3 inline-block rounded text-sm font-medium text-brand-strong hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
                >
                  Open in Maps →
                </a>
              </div>
              <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
                <h3 className="text-sm font-semibold">When</h3>
                <p className="mt-2 text-sm text-muted">{VENUE.doorsOpen}</p>
                <p className="mt-2 text-sm text-muted">
                  Check-in opens an hour before kickoff.
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
                <h3 className="text-sm font-semibold">Questions</h3>
                <p className="mt-2 text-sm text-muted">{VENUE.phone}</p>
                <p className="mt-1 text-sm text-muted">{VENUE.email}</p>
                <p className="mt-3 text-xs text-muted">
                  Paid by MTN, Vodafone or AirtelTigo mobile money.
                </p>
              </div>
            </div>

            <p className="mt-8 text-xs text-muted">
              Photographs by{" "}
              {PHOTO_CREDITS.map((c, i) => (
                <span key={c.url}>
                  <a href={c.url} className="hover:text-foreground hover:underline">
                    {c.name}
                  </a>
                  {i < PHOTO_CREDITS.length - 1 ? ", " : ""}
                </span>
              ))}{" "}
              on{" "}
              <a
                href="https://unsplash.com"
                className="hover:text-foreground hover:underline"
              >
                Unsplash
              </a>
              . They show other venues, not ours.
            </p>
          </section>
        </Container>
      </main>

      <SiteFooter />
    </div>
  );
}
