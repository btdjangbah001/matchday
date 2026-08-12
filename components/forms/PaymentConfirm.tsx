"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { pollPaymentStatus } from "@/app/actions";

export function PaymentConfirm({
  applicationId,
  phone,
  amountLabel,
}: {
  applicationId: string;
  phone: string;
  amountLabel: string;
}) {
  const router = useRouter();
  const [failed, setFailed] = useState(false);
  const [checking, setChecking] = useState(false);

  const check = useCallback(async () => {
    setChecking(true);
    try {
      const res = await pollPaymentStatus(applicationId);
      if (res.status === "paid" && res.qrToken) {
        router.replace(`/ticket/${res.qrToken}`);
      } else if (res.status === "failed") {
        setFailed(true);
      }
    } finally {
      setChecking(false);
    }
  }, [applicationId, router]);

  // Listen continuously; the callback may confirm before the customer taps.
  useEffect(() => {
    const id = setInterval(check, 4000);
    return () => clearInterval(id);
  }, [check]);

  if (failed) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-red-600 dark:text-red-400">
          That payment didn&apos;t go through.
        </p>
        <a
          href={`/pay/${applicationId}`}
          className="inline-flex rounded-xl bg-brand px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-strong"
        >
          Try again
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-5 text-center">
      <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-brand border-t-transparent" />
      <div>
        <p className="font-medium">Approve the prompt on your phone</p>
        <p className="mt-1 text-sm text-muted">
          We sent a Mobile Money request for{" "}
          <span className="font-semibold text-foreground">{amountLabel}</span> to{" "}
          {phone}. Enter your MoMo PIN to confirm.
        </p>
      </div>
      <button
        type="button"
        onClick={check}
        disabled={checking}
        className="w-full rounded-xl bg-brand px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-strong disabled:opacity-60"
      >
        {checking ? "Checking…" : "I've paid"}
      </button>
      <p className="text-xs text-muted">
        This page updates automatically once payment is confirmed.
      </p>
    </div>
  );
}
