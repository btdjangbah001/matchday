import Link from "next/link";
import type { ReactNode } from "react";
import { SELECTABLE_NETWORKS } from "@/lib/network";

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

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur">
      <Container className="flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-white">
            ⚽
          </span>
          <span>Matchday</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <HeaderLink href="/apply/seat">Seats</HeaderLink>
          <HeaderLink href="/apply/parking">Parking</HeaderLink>
          <HeaderLink href="/apply/vendor">Vendors</HeaderLink>
          <Link
            href="/backoffice"
            className="ml-1 rounded-lg px-3 py-1.5 text-muted hover:text-foreground"
          >
            Staff
          </Link>
        </nav>
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

/** Standard page shell for public pages: header, centered content, footer. */
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
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-border bg-surface p-6 shadow-sm ${className}`}
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
      className={`inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-medium transition ${styles} ${className}`}
    >
      {children}
    </Link>
  );
}
