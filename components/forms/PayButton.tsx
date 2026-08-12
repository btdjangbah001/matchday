"use client";

import { useActionState } from "react";
import { startCheckout, type FormState } from "@/app/actions";
import { SubmitButton } from "@/components/SubmitButton";
import { FormError } from "@/components/ui";

export function PayButton({
  applicationId,
  label,
}: {
  applicationId: string;
  label: string;
}) {
  const [state, action] = useActionState<FormState, FormData>(
    startCheckout,
    {},
  );

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="applicationId" value={applicationId} />
      <FormError message={state.error} />
      <SubmitButton pendingText="Redirecting…" className="w-full">
        {label}
      </SubmitButton>
    </form>
  );
}
