import { redirect } from "next/navigation";
import { Card, LinkButton, NotFoundScreen, PageShell } from "@/components/ui";
import { VerifyForm } from "@/components/forms/VerifyForm";
import { getApplication } from "@/lib/queries";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

function maskPhone(phone: string): string {
  return phone.replace(/^(\+\d{3})\d+(\d{2})$/, "$1•••••$2");
}

export default async function VerifyPage({
  params,
}: {
  params: Promise<{ applicationId: string }>;
}) {
  const { applicationId } = await params;
  const app = await getApplication(applicationId);
  if (!app) {
    return (
      <NotFoundScreen
        title="We couldn't find that application"
        message="This verification link doesn't match an application we hold. It may have expired, or the link may be incomplete. Starting again takes under a minute."
      >
        <LinkButton href="/fixtures">Browse fixtures</LinkButton>
        <LinkButton href="/account" variant="ghost">
          Find my bookings
        </LinkButton>
      </NotFoundScreen>
    );
  }

  // Already past verification — send them to the next step.
  if (app.status !== "pending_otp") {
    redirect(`/pay/${applicationId}`);
  }

  return (
    <PageShell>
      <h1 className="mb-1 text-3xl font-bold tracking-tight">
        Verify your phone
      </h1>
      <p className="mb-6 text-muted">
        We sent a 6-digit code to <strong>{maskPhone(app.phone)}</strong>.
      </p>
      <Card>
        <VerifyForm applicationId={applicationId} />
      </Card>
      {process.env.NODE_ENV !== "production" && (
        <p className="mt-4 text-center text-xs text-muted">
          Dev tip: the code is printed in the server console (SMS mock).
        </p>
      )}
    </PageShell>
  );
}
