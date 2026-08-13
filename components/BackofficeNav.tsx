"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/Icons";

export interface NavItem {
  href: string;
  label: string;
  icon: string;
}

export interface NavGroup {
  heading: string;
  items: NavItem[];
}

function isCurrent(pathname: string, href: string): boolean {
  if (href === "/backoffice") return pathname === "/backoffice";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function BackofficeNav({ groups }: { groups: NavGroup[] }) {
  const pathname = usePathname();

  return (
    <nav className="space-y-6">
      {groups.map((group) => (
        <div key={group.heading}>
          <p className="px-3 text-xs font-semibold uppercase tracking-wider text-muted">
            {group.heading}
          </p>
          <ul className="mt-2 space-y-0.5">
            {group.items.map((item) => {
              const current = isCurrent(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={current ? "page" : undefined}
                    className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${
                      current
                        ? "bg-brand/12 text-brand-strong"
                        : "text-foreground hover:bg-foreground/5"
                    }`}
                  >
                    <Icon
                      name={item.icon}
                      className={`h-4 w-4 shrink-0 ${current ? "text-brand-strong" : "text-muted"}`}
                    />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
