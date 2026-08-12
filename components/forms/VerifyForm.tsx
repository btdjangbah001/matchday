"use client";

import { useActionState } from "react";
import {
  resendApplicationOtp,
  verifyApplicationOtp,
  type FormState,
} from "@/app/actions";
import { SubmitButton } from "@/components/SubmitButton";
import { Field, FormError, inputClass } from "@/components/ui";

export function VerifyForm({ applicationId }: { applicationId: string }) {
  const [state, action] = useActionState<FormState, FormData>(
    verifyApplicationOtp,
    {},
  );
  const [resendState, resendAction] = useActionState<FormState, FormData>(
    resendApplicationOtp,
    {},
  );

  return (
    <div className="space-y-4">
      <form action={action} className="space-y-4">
        <input type="hidden" name="applicationId" value={applicationId} />
        <Field label="Verification code">
          <input
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="123456"
            required
            className={`${inputClass} tracking-[0.4em]`}
          />
        </Field>
        <FormError message={state.error} />
        <SubmitButton pendingText="Verifying…" className="w-full">
          Verify
        </SubmitButton>
      </form>

      <form action={resendAction}>
        <input type="hidden" name="applicationId" value={applicationId} />
        <SubmitButton variant="ghost" pendingText="Sending…" className="w-full">
          Resend code
        </SubmitButton>
        {resendState.sent && (
          <p className="mt-2 text-center text-xs text-emerald-600">
            A new code has been sent.
          </p>
        )}
        <FormError message={resendState.error} />
      </form>
    </div>
  );
}
