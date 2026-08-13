import { redirect } from "next/navigation";
import { Card, PageShell } from "@/components/ui";
import { CustomerLoginForm } from "@/components/forms/CustomerLoginForm";
import { getCustomerPhone } from "@/lib/customer-session";

export const dynamic = "force-dynamic";

export default async function CustomerLoginPage() {
  if (await getCustomerPhone()) redirect("/account");

  return (
    <PageShell>
      <h1 className="mb-1 text-3xl font-bold tracking-tight">Your tickets</h1>
      <p className="mb-6 text-muted">
        No account needed — sign in with the phone number you book with to see
        every pass and application tied to it.
      </p>
      <Card>
        <CustomerLoginForm />
      </Card>
      {process.env.NODE_ENV !== "production" && (
        <p className="mt-4 text-center text-xs text-muted">
          Dev tip: the code prints in the server console (SMS mock).
        </p>
      )}
    </PageShell>
  );
}
