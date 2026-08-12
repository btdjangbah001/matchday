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

  return (
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
  );
}
