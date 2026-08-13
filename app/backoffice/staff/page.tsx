import { redirect } from "next/navigation";
import { Card, StatusPill } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { AddStaffForm } from "@/components/forms/AddStaffForm";
import { requireStaff } from "@/lib/session";
import { getStaffList } from "@/lib/queries";
import { toggleStaff } from "@/app/backoffice/actions";

export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  self: "You can't remove your own access while you're signed in.",
  "last-admin": "That's the only active admin. Promote someone else first.",
};

export default async function StaffPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await requireStaff();
  if (session.role !== "admin") redirect("/backoffice");

  const [rows, { error }] = await Promise.all([getStaffList(), searchParams]);
  const message = error ? ERRORS[error] : undefined;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Staff</h1>
        <p className="text-sm text-muted">
          Anyone listed here can sign in to the back office with their phone
          number. There are no passwords — access is the list.
        </p>
      </div>

      {message && (
        <p className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
          {message}
        </p>
      )}

      <Card className="!p-0">
        <ul className="divide-y divide-border">
          {rows.map((member) => (
            <li
              key={member.id}
              className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
            >
              <div>
                <p className="font-medium">
                  {member.name}
                  {member.id === session.staffId && (
                    <span className="ml-2 text-xs text-muted">you</span>
                  )}
                </p>
                <p className="text-sm text-muted">{member.phone}</p>
              </div>
              <div className="flex items-center gap-3">
                <StatusPill
                  status={member.role === "admin" ? "approved" : "otp_verified"}
                />
                <span className="text-sm text-muted">
                  {member.active ? "Active" : "No access"}
                </span>
                <form action={toggleStaff}>
                  <input type="hidden" name="id" value={member.id} />
                  <SubmitButton variant="ghost" pendingText="…">
                    {member.active ? "Remove access" : "Restore access"}
                  </SubmitButton>
                </form>
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <h2 className="font-semibold">Add a staff member</h2>
        <p className="mt-1 text-sm text-muted">
          They sign in with this number, so it must be the phone they carry.
          Admins can manage staff and seasons; staff cannot.
        </p>
        <AddStaffForm />
      </Card>
    </div>
  );
}
