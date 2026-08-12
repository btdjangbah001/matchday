"use client";

import { useActionState } from "react";
import { applyForParking, type FormState } from "@/app/actions";
import { SubmitButton } from "@/components/SubmitButton";
import {
  Field,
  FormError,
  MatchSelect,
  NetworkSelect,
  inputClass,
} from "@/components/ui";

export function ParkingForm({
  options,
  selectedId,
}: {
  options: { value: number; label: string; disabled?: boolean }[];
  selectedId?: number;
}) {
  const [state, action] = useActionState<FormState, FormData>(
    applyForParking,
    {},
  );

  return (
    <form action={action} className="space-y-4">
      <Field label="Match">
        <MatchSelect options={options} selectedId={selectedId} />
      </Field>
      <Field label="Car registration number">
        <input
          name="carRegistration"
          type="text"
          placeholder="GR 1234-24"
          required
          className={inputClass}
        />
      </Field>
      <Field label="Phone number" hint="We'll text you a verification code.">
        <input
          name="phone"
          type="tel"
          autoComplete="tel"
          placeholder="024 123 4567"
          required
          className={inputClass}
        />
      </Field>
      <Field
        label="Mobile money network"
        hint="The network your MoMo wallet is on (it may differ from your number's network if you've ported)."
      >
        <NetworkSelect />
      </Field>
      <FormError message={state.error} />
      <SubmitButton pendingText="Sending code…" className="w-full">
        Continue
      </SubmitButton>
    </form>
  );
}
