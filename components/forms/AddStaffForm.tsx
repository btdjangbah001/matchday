"use client";

import { useActionState } from "react";
import { addStaff, type StaffFormState } from "@/app/backoffice/actions";
import { SubmitButton } from "@/components/SubmitButton";
import { FormError, inputClass } from "@/components/ui";

export function AddStaffForm() {
  const [state, action] = useActionState<StaffFormState, FormData>(
    addStaff,
    {},
  );

  return (
    <form action={action} className="mt-4 space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-xs font-medium text-muted">
          Name
          <input
            name="name"
            required
            placeholder="Ama Mensah"
            className={`mt-1 w-48 ${inputClass}`}
          />
        </label>
        <label className="text-xs font-medium text-muted">
          Phone number
          <input
            name="phone"
            type="tel"
            required
            placeholder="024 123 4567"
            className={`mt-1 w-48 ${inputClass}`}
          />
        </label>
        <label className="text-xs font-medium text-muted">
          Role
          <select name="role" defaultValue="staff" className={`mt-1 w-36 ${inputClass}`}>
            <option value="staff">Staff</option>
            <option value="admin">Admin</option>
          </select>
        </label>
        <SubmitButton pendingText="Adding…">Add staff member</SubmitButton>
      </div>
      <FormError message={state.error} />
      {state.added && (
        <p className="text-sm text-brand-strong">
          {state.added} can now sign in with their phone number.
        </p>
      )}
    </form>
  );
}
