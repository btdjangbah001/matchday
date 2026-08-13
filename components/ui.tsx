import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { SELECTABLE_NETWORKS } from "@/lib/network";
import { TICKET_TYPE_LABELS } from "@/lib/constants";
import { displayTeam, formatKickoff, formatMoney } from "@/lib/format";
import type { Inventory, Match } from "@/db/schema";

export const inputClass =
  "w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/30";

export function Container({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`mx-auto w-full max-w-5xl px-5 ${className}`}>{children}</div>
  );
}

const NAV_LINKS = [
  { href: "/fixtures", label: "Fixtures" },
  { href: "/apply/vendor", label: "Vendors" },
  { href: "/account", label: "My tickets" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
      <Container className="flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-white">
            ⚽
          </span>
          <span>Matchday</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 text-sm sm:flex">
          {NAV_LINKS.map((l) => (
            <HeaderLink key={l.href} href={l.href}>
              {l.label}
            </HeaderLink>
          ))}
          <Link
            href="/backoffice"
            className="ml-1 rounded-lg px-3 py-1.5 text-muted hover:text-foreground"
          >
            Staff
          </Link>
        </nav>

        {/* Mobile menu (JS-free disclosure) */}
        <details className="relative sm:hidden">
          <summary className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-lg border border-border [&::-webkit-details-marker]:hidden">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <span className="sr-only">Menu</span>
          </summary>
          <div className="absolute right-0 top-full mt-2 w-52 rounded-xl border border-border bg-surface p-2 shadow-lg">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="block rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-foreground/5"
              >
                {l.label}
              </Link>
            ))}
            <Link
              href="/backoffice"
              className="block rounded-lg px-3 py-2.5 text-sm text-muted hover:bg-foreground/5"
            >
              Staff sign in
            </Link>
          </div>
        </details>
      </Container>
    </header>
  );
}

function HeaderLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-lg px-3 py-1.5 font-medium hover:bg-foreground/5"
    >
      {children}
    </Link>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-border">
      <Container className="flex flex-col items-center justify-between gap-2 py-8 text-sm text-muted sm:flex-row">
        <p>© {new Date().getFullYear()} Matchday · Football Watch Centre</p>
        <Link href="/backoffice" className="hover:text-foreground">
          Back office →
        </Link>
      </Container>
    </footer>
  );
}

export function PageShell({
  children,
  width = "narrow",
}: {
  children: ReactNode;
  width?: "narrow" | "wide";
}) {
  const max = width === "narrow" ? "max-w-xl" : "max-w-5xl";
  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader />
      <main className="flex-1">
        <div className={`mx-auto w-full ${max} px-5 py-10`}>{children}</div>
      </main>
      <SiteFooter />
    </div>
  );
}

export function Card({
  children,
  className = "",
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={`rounded-2xl border border-border bg-surface p-6 shadow-sm ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}

export function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1.5" htmlFor={htmlFor}>
      <span className="text-sm font-medium">{label}</span>
      {children}
      {hint ? <span className="block text-xs text-muted">{hint}</span> : null}
    </label>
  );
}

export function NetworkSelect() {
  return (
    <select name="network" required defaultValue="" className={inputClass}>
      <option value="" disabled>
        Select your mobile money network…
      </option>
      {SELECTABLE_NETWORKS.map((n) => (
        <option key={n.value} value={n.value}>
          {n.label}
        </option>
      ))}
    </select>
  );
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="rounded-xl bg-red-500/10 px-3.5 py-2.5 text-sm text-red-600 dark:text-red-400">
      {message}
    </p>
  );
}

export function MatchSelect({
  options,
  selectedId,
}: {
  options: { value: number; label: string; disabled?: boolean }[];
  selectedId?: number;
}) {
  const preselect =
    selectedId != null && options.some((o) => o.value === selectedId && !o.disabled)
      ? String(selectedId)
      : "";
  return (
    <select
      name="matchId"
      required
      defaultValue={preselect}
      className={inputClass}
    >
      <option value="" disabled>
        Select a match…
      </option>
      {options.map((o) => (
        <option key={o.value} value={o.value} disabled={o.disabled}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

const pillStyles: Record<string, string> = {
  pending_otp: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  otp_verified: "bg-sky-500/15 text-sky-700 dark:text-sky-400",
  awaiting_review: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  approved: "bg-brand/15 text-brand-strong",
  rejected: "bg-red-500/15 text-red-600 dark:text-red-400",
  awaiting_payment: "bg-sky-500/15 text-sky-700 dark:text-sky-400",
  paid: "bg-brand/15 text-brand-strong",
  checked_in: "bg-brand text-white",
  cancelled: "bg-foreground/10 text-muted",
};

export function StatusPill({ status }: { status: string }) {
  const cls = pillStyles[status] ?? "bg-foreground/10 text-muted";
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

export function Badge({
  children,
  tone = "brand",
}: {
  children: ReactNode;
  tone?: "brand" | "muted";
}) {
  const cls =
    tone === "brand"
      ? "bg-brand/12 text-brand-strong"
      : "bg-foreground/8 text-muted";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${cls}`}
    >
      {children}
    </span>
  );
}

export function LinkButton({
  href,
  children,
  variant = "primary",
  className = "",
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "ghost";
  className?: string;
}) {
  const styles =
    variant === "primary"
      ? "bg-brand text-white hover:bg-brand-strong shadow-sm"
      : "border border-border hover:bg-foreground/5";
  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-medium transition duration-150 ease-out active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:active:scale-100 ${styles} ${className}`}
    >
      {children}
    </Link>
  );
}

export function FixtureCard({
  match,
  inventory,
  variant = "full",
  className = "",
}: {
  match: Match;
  inventory: Inventory[];
  variant?: "full" | "compact";
  className?: string;
}) {
  const minPrice = inventory.length
    ? Math.min(...inventory.map((i) => i.priceMinor))
    : 0;

  return (
    // No hover lift: the card isn't clickable, only the buttons inside it.
    <div
      className={`rounded-2xl border border-border bg-surface p-5 shadow-sm ${className}`}
    >
      <div className="flex items-center justify-between gap-3">
        <Badge tone="muted">{match.competition || "Fixture"}</Badge>
        <span className="text-xs text-muted">{formatKickoff(match.kickoff)}</span>
      </div>

      <p className="mt-3 text-lg font-semibold">
        {displayTeam(match.team1)} <span className="text-muted">vs</span>{" "}
        {displayTeam(match.team2)}
      </p>

      {inventory.length === 0 ? (
        <div className="mt-4 border-t border-border pt-4 text-sm text-muted">
          Not on sale yet.
        </div>
      ) : variant === "compact" ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
          <span className="text-sm text-muted">
            from{" "}
            <span className="font-semibold text-foreground">
              {formatMoney(minPrice)}
            </span>{" "}
            · {inventory.map((i) => TICKET_TYPE_LABELS[i.type]).join(" · ")}
          </span>
          <LinkButton
            href={`/apply/seat?match=${match.id}`}
            className="!py-2 text-xs"
          >
            Book
          </LinkButton>
        </div>
      ) : (
        <>
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
                  <span className="text-muted">{formatMoney(inv.priceMinor)}</span>
                  <span className={left > 0 ? "text-brand-strong" : "text-red-500"}>
                    · {left > 0 ? `${left} left` : "sold out"}
                  </span>
                </span>
              );
            })}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
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
            <LinkButton
              href={`/apply/vendor?match=${match.id}`}
              variant="ghost"
              className="flex-1 !py-2 text-xs"
            >
              Vend
            </LinkButton>
          </div>
        </>
      )}
    </div>
  );
}
