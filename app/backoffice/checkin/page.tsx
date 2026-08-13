import { CheckInPanel } from "@/components/CheckInPanel";
import { requireStaff } from "@/lib/session";
import { getRecentCheckIns } from "@/lib/queries";
import { scopeTitle } from "@/lib/format";
import { TICKET_TYPE_LABELS } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function CheckInPage() {
  await requireStaff();
  const recent = await getRecentCheckIns();

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <div>
        <h1 className="mb-1 text-2xl font-bold">Check-in</h1>
        <p className="mb-6 text-sm text-neutral-500">
          Scan a guest&apos;s QR or type their check-in code.
        </p>
        <CheckInPanel />
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold">Recent check-ins</h2>
        {recent.length === 0 ? (
          <p className="text-sm text-neutral-500">No one checked in yet.</p>
        ) : (
          <ul className="space-y-2">
            {recent.map(({ application: app, match, season }) => (
              <li
                key={app.id}
                className="rounded-lg border border-black/10 bg-white px-4 py-2 text-sm dark:border-white/10 dark:bg-neutral-900"
              >
                <div className="flex justify-between">
                  <span className="font-medium">
                    {[app.firstName, app.lastName].filter(Boolean).join(" ") ||
                      app.phone}
                  </span>
                  <span className="text-neutral-400">
                    {TICKET_TYPE_LABELS[app.type]}
                  </span>
                </div>
                <p className="text-xs text-neutral-500">
                  {scopeTitle(match, season)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
