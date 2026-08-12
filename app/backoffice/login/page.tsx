import { redirect } from "next/navigation";
import { Card } from "@/components/ui";
import { StaffLoginForm } from "@/components/forms/StaffLoginForm";
import { getStaffSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function StaffLoginPage() {
  if (await getStaffSession()) redirect("/backoffice");

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="mb-1 text-2xl font-bold">Staff sign in</h1>
      <p className="mb-6 text-sm text-neutral-600 dark:text-neutral-400">
        We&apos;ll text a one-time code to your registered phone.
      </p>
      <Card>
        <StaffLoginForm />
      </Card>
      {process.env.NODE_ENV !== "production" && (
        <p className="mt-4 text-center text-xs text-neutral-400">
          Dev tip: the code prints in the server console (SMS mock).
        </p>
      )}
    </div>
  );
}
