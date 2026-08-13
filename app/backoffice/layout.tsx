import Link from "next/link";
import { LogoMark } from "@/components/Logo";
import type { ReactNode } from "react";
import { getStaffSession } from "@/lib/session";
import { logout } from "@/app/backoffice/actions";

export const dynamic = "force-dynamic";

const NAV = [
  { href: "/backoffice", label: "Dashboard" },
  { href: "/backoffice/reports", label: "Reports" },
  { href: "/backoffice/applications", label: "Applications" },
  { href: "/backoffice/vendors", label: "Vendors" },
  { href: "/backoffice/checkin", label: "Check-in" },
  { href: "/backoffice/matches", label: "Matches" },
  { href: "/backoffice/competitions", label: "Competitions" },
];

export default async function BackofficeLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getStaffSession();

  return (
    <div className="min-h-full">
      <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-5 py-3">
          <Link href="/backoffice" className="flex items-center gap-2 font-semibold">
            <LogoMark className="h-6 w-6 text-brand" />
            Matchday <span className="text-muted">Back Office</span>
          </Link>
          {session && (
            <nav className="flex items-center gap-1 text-sm">
              {NAV.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  className="rounded-lg px-3 py-1.5 font-medium hover:bg-foreground/5"
                >
                  {n.label}
                </Link>
              ))}
              <form action={logout}>
                <button
                  type="submit"
                  className="rounded-lg px-3 py-1.5 text-muted hover:bg-foreground/5"
                >
                  Sign out
                </button>
              </form>
            </nav>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-5 py-8">{children}</main>
    </div>
  );
}
