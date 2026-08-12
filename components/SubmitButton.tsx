"use client";

import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";

export function SubmitButton({
  children,
  pendingText,
  className = "",
  variant = "primary",
}: {
  children: ReactNode;
  pendingText?: string;
  className?: string;
  variant?: "primary" | "ghost";
}) {
  const { pending } = useFormStatus();
  const styles =
    variant === "primary"
      ? "bg-brand text-white hover:bg-brand-strong shadow-sm disabled:opacity-60"
      : "border border-border hover:bg-foreground/5 disabled:opacity-60";
  return (
    <button
      type="submit"
      disabled={pending}
      className={`inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-medium transition ${styles} ${className}`}
    >
      {pending && pendingText ? pendingText : children}
    </button>
  );
}
