"use client";

import { useActionState } from "react";
import {
  staffRequestOtp,
  staffVerifyOtp,
  type LoginState,
} from "@/app/backoffice/actions";
import { SubmitButton } from "@/components/SubmitButton";
import { Field, FormError, inputClass } from "@/components/ui";

export function StaffLoginForm() {
  const [reqState, requestAction] = useActionState<LoginState, FormData>(
    staffRequestOtp,
    {},
  );

  if (reqState.step === "code" && reqState.phone) {
    return <CodeStep phone={reqState.phone} />;
  }

  return (
    <form action={requestAction} className="space-y-4">
      <Field label="Staff phone number">
        <input
          name="phone"
          type="tel"
          autoComplete="tel"
          placeholder="024 123 4567"
          required
          className={inputClass}
        />
      </Field>
      <FormError message={reqState.error} />
      <SubmitButton pendingText="Sending code…" className="w-full">
        Send login code
      </SubmitButton>
    </form>
  );
}

function CodeStep({ phone }: { phone: string }) {
  const [state, verifyAction] = useActionState<LoginState, FormData>(
    staffVerifyOtp,
    { step: "code", phone },
  );
  const [resendState, resendAction] = useActionState<LoginState, FormData>(
    staffRequestOtp,
    {},
  );

  return (
    <>
    <form action={verifyAction} className="space-y-4">
      <input type="hidden" name="phone" value={phone} />
      <Field label="Enter the code we texted you">
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
        Sign in
      </SubmitButton>
    </form>

      <form action={resendAction} className="mt-4 text-center">
        <input type="hidden" name="phone" value={phone} />
        <button
          type="submit"
          className="rounded text-sm text-brand-strong hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
        >
          Didn&apos;t get the code? Send another
        </button>
        {resendState.step === "code" && (
          <p className="mt-1 text-sm text-muted">New code sent.</p>
        )}
        <FormError message={resendState.error} />
      </form>
    </>
  );
}
