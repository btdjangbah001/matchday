"use client";

import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { checkIn, type CheckInState } from "@/app/backoffice/actions";
import { SubmitButton } from "@/components/SubmitButton";
import { Card, FormError, inputClass } from "@/components/ui";

// Minimal typing for the browser-native BarcodeDetector (not in TS DOM libs).
interface DetectedBarcode {
  rawValue: string;
}
interface BarcodeDetectorLike {
  detect(source: CanvasImageSource): Promise<DetectedBarcode[]>;
}
type BarcodeDetectorCtor = new (opts?: {
  formats?: string[];
}) => BarcodeDetectorLike;

export function CheckInPanel() {
  const [state, action] = useActionState<CheckInState, FormData>(checkIn, {});
  const [value, setValue] = useState("");

  function submitValue(v: string) {
    const fd = new FormData();
    fd.set("value", v);
    startTransition(() => action(fd));
  }

  return (
    <div className="space-y-4">
      <Card>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submitValue(value);
          }}
          className="space-y-3"
        >
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">Check-in code</span>
            <input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="e.g. 7F3KQ2MX"
              autoFocus
              className={`${inputClass} font-mono uppercase tracking-widest`}
            />
          </label>
          <SubmitButton className="w-full">Check in</SubmitButton>
        </form>
      </Card>

      <Scanner onScan={(v) => submitValue(v)} />

      {state.error && <FormError message={state.error} />}
      {state.success && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
          <p className="text-lg font-semibold">✓ Checked in</p>
          <p className="mt-1 text-sm">
            {state.success.name} · {state.success.type} · {state.success.fixture}
          </p>
          <p className="text-xs opacity-80">Code {state.success.code}</p>
        </div>
      )}
    </div>
  );
}

function Scanner({ onScan }: { onScan: (value: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [active, setActive] = useState(false);
  const [unsupported, setUnsupported] = useState(false);

  function start() {
    if (typeof window === "undefined" || !("BarcodeDetector" in window)) {
      setUnsupported(true);
      return;
    }
    setActive(true);
  }

  useEffect(() => {
    if (!active) return;
    let stream: MediaStream | null = null;
    let raf = 0;
    let stopped = false;

    const Ctor = (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor })
      .BarcodeDetector;
    if (!Ctor) return;
    const detector = new Ctor({ formats: ["qr_code"] });

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        if (stopped) return;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();

        const tick = async () => {
          if (stopped || !videoRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current);
            if (codes.length > 0) {
              onScan(codes[0].rawValue);
              setActive(false);
              return;
            }
          } catch {
            // ignore transient detect errors and keep scanning
          }
          raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      } catch {
        setActive(false);
      }
    })();

    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [active, onScan]);

  if (unsupported) {
    return (
      <p className="text-center text-xs text-neutral-400">
        QR scanning isn&apos;t supported in this browser — type the code above.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {active ? (
        <>
          <video
            ref={videoRef}
            muted
            playsInline
            className="mx-auto aspect-square w-full max-w-xs rounded-xl border border-black/10 object-cover dark:border-white/10"
          />
          <button
            type="button"
            onClick={() => setActive(false)}
            className="mx-auto block rounded-lg border border-black/15 px-4 py-2 text-sm dark:border-white/15"
          >
            Stop camera
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={start}
          className="w-full rounded-lg border border-black/15 px-4 py-2 text-sm font-medium hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/5"
        >
          Scan QR with camera
        </button>
      )}
    </div>
  );
}
