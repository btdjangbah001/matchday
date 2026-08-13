"use client";

import { useActionState } from "react";
import { resendVendorPaymentLink } from "@/app/backoffice/actions";
import { SubmitButton } from "@/components/SubmitButton";

export function ResendPaymentLink({
  applicationId,
  link,
}: {
  applicationId: string;
  link: string;
}) {
  const [state, action] = useActionState(resendVendorPaymentLink, {});

  return (
    <div className="mt-2 w-full rounded-lg border border-border bg-background/60 p-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <code className="min-w-0 flex-1 truncate text-xs text-muted">{link}</code>
        <form action={action}>
          <input type="hidden" name="applicationId" value={applicationId} />
          <SubmitButton variant="ghost" pendingText="Sending…" className="!py-1.5 text-xs">
            Resend by SMS
          </SubmitButton>
        </form>
      </div>
      {state.sent && (
        <p className="mt-1.5 text-xs text-brand-strong">
          Payment link sent again.
        </p>
      )}
      {state.error && (
        <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">
          {state.error}
        </p>
      )}
    </div>
  );
}
