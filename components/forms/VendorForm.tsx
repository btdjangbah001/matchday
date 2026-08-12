"use client";

import { useActionState } from "react";
import { applyForVendor, type FormState } from "@/app/actions";
import { SubmitButton } from "@/components/SubmitButton";
import {
  Field,
  FormError,
  MatchSelect,
  NetworkSelect,
  inputClass,
} from "@/components/ui";
import { VENDOR_TYPES } from "@/lib/constants";

export function VendorForm({
  options,
  selectedId,
}: {
  options: { value: number; label: string; disabled?: boolean }[];
  selectedId?: number;
}) {
  const [state, action] = useActionState<FormState, FormData>(
    applyForVendor,
    {},
  );

  return (
    <form action={action} className="space-y-4">
      <Field label="Match">
        <MatchSelect options={options} selectedId={selectedId} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="First name">
          <input name="firstName" type="text" required className={inputClass} />
        </Field>
        <Field label="Last name">
          <input name="lastName" type="text" required className={inputClass} />
        </Field>
      </div>
      <Field label="What are you selling?">
        <select
          name="vendorType"
          required
          defaultValue=""
          className={inputClass}
        >
          <option value="" disabled>
            Select a category…
          </option>
          {VENDOR_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
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
        Submit application
      </SubmitButton>
    </form>
  );
}
