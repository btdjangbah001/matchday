import Link from "next/link";
import type { ReactNode } from "react";
import { LogoMark } from "@/components/Logo";
import { BackofficeNav, type NavGroup } from "@/components/BackofficeNav";
import { getStaffSession } from "@/lib/session";
import { logout } from "@/app/backoffice/actions";

export const dynamic = "force-dynamic";

const NAV: NavGroup[] = [
  {
    heading: "Match day",
    items: [
      { href: "/backoffice", label: "Dashboard", icon: "grid" },
      { href: "/backoffice/checkin", label: "Check-in", icon: "scan" },
    ],
  },
  {
    heading: "Bookings",
    items: [
      { href: "/backoffice/applications", label: "Applications", icon: "list" },
      { href: "/backoffice/vendors", label: "Vendors", icon: "people" },
      { href: "/backoffice/reports", label: "Reports", icon: "chart" },
    ],
  },
  {
    heading: "Setup",
    items: [
      { href: "/backoffice/matches", label: "Matches", icon: "calendar" },
      { href: "/backoffice/seasons", label: "Seasons", icon: "trophy" },
      { href: "/backoffice/competitions", label: "Competitions", icon: "food" },
      { href: "/backoffice/staff", label: "Staff", icon: "people" },
    ],
  },
];

function Wordmark() {
  return (
    <Link
      href="/backoffice"
      className="flex items-center gap-2 rounded-lg font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
    >
      <LogoMark className="h-6 w-6 text-brand" />
      Matchday <span className="text-muted">Back Office</span>
    </Link>
  );
}

function SignOut({ className = "" }: { className?: string }) {
  return (
    <form action={logout}>
      <button
        type="submit"
        className={`rounded-lg px-3 py-2 text-sm text-muted transition hover:bg-foreground/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${className}`}
      >
        Sign out
      </button>
    </form>
  );
}

export default async function BackofficeLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getStaffSession();

  if (!session) {
    return (
      <div className="min-h-full">
        <header className="border-b border-border">
          <div className="mx-auto max-w-5xl px-5 py-3">
            <Wordmark />
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-5 py-8">{children}</main>
      </div>
    );
  }

  return (
    <div className="min-h-full lg:grid lg:grid-cols-[16rem_1fr]">
      <aside className="hidden border-r border-border lg:flex lg:h-screen lg:sticky lg:top-0 lg:flex-col">
        <div className="border-b border-border px-5 py-4">
          <Wordmark />
        </div>
        <div className="flex-1 overflow-y-auto px-2 py-5">
          <BackofficeNav groups={NAV} />
        </div>
        <div className="border-t border-border px-2 py-3">
          <SignOut className="w-full text-left" />
        </div>
      </aside>

      <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between gap-3 px-5 py-3">
          <Wordmark />
          <details className="relative">
            <summary className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-lg border border-border [&::-webkit-details-marker]:hidden">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M3 6h18M3 12h18M3 18h18"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
              <span className="sr-only">Menu</span>
            </summary>
            <div className="absolute right-0 top-full z-30 mt-2 w-60 rounded-xl border border-border bg-surface p-2 shadow-lg">
              <BackofficeNav groups={NAV} />
              <div className="mt-3 border-t border-border pt-2">
                <SignOut className="w-full text-left" />
              </div>
            </div>
          </details>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-5 py-8">{children}</main>
    </div>
  );
}
