"use client";

import { Camera, CameraOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TrackerStatus } from "@/hooks/use-hand-tracker";
import { cn } from "@/lib/utils";

/** Camera cu scheletul mâinilor desenat peste video, eticheta semnului și încrederea. */
export function CameraView({
  videoRef,
  canvasRef,
  status,
  error,
  handsVisible,
  label,
  confidence,
  stability,
  onStart,
  onStop,
  overlay,
  className,
}: {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  status: TrackerStatus;
  error: string | null;
  handsVisible: number;
  label: string | null;
  confidence: number;
  stability?: number;
  onStart: () => void;
  onStop: () => void;
  overlay?: React.ReactNode;
  className?: string;
}) {
  const active = status === "ready" || status === "loading";
  return (
    <div className={cn("overflow-hidden rounded-3xl bg-ink text-white", className)}>
      <div className="relative aspect-[4/3] w-full bg-black">
        <video ref={videoRef} playsInline muted className="mirror absolute inset-0 size-full object-cover" aria-hidden />
        <canvas ref={canvasRef} className="mirror absolute inset-0 size-full object-cover" aria-hidden />
        {status === "idle" || status === "denied" || status === "error" ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
            <CameraOff className="size-10 text-white/60" aria-hidden />
            {error ? (
              <p className="max-w-sm text-lg font-bold" role="alert">
                {error}
              </p>
            ) : (
              <p className="max-w-sm text-lg">Camera e oprită. Imaginea nu se înregistrează și nu pleacă de pe dispozitiv.</p>
            )}
            <Button size="lg" onClick={onStart} className="bg-white text-ink hover:bg-white/90">
              <Camera aria-hidden />
              {status === "idle" ? "Pornește camera" : "Încearcă din nou"}
            </Button>
          </div>
        ) : null}
        {status === "loading" ? (
          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/40 text-lg font-bold" role="status">
            <Loader2 className="size-6 animate-spin" aria-hidden />
            Se încarcă recunoașterea mâinilor…
          </div>
        ) : null}
        {status === "ready" ? (
          <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3">
            <span className="rounded-full bg-black/60 px-3 py-1.5 text-sm font-bold">
              {handsVisible === 0 ? "Nicio mână" : handsVisible === 1 ? "1 mână" : "2 mâini"}
            </span>
            <Button size="sm" variant="secondary" onClick={onStop} className="bg-black/60 text-white hover:bg-black/80">
              <CameraOff aria-hidden />
              Oprește
            </Button>
          </div>
        ) : null}
        {overlay}
      </div>
      {active ? (
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold uppercase tracking-wider text-white/60">Semn detectat</p>
            <p className="truncate font-display text-2xl font-extrabold" aria-live="polite">
              {label ?? "—"}
            </p>
          </div>
          <div className="w-28 shrink-0 text-right">
            <p className="text-sm font-bold text-white/60">Încredere</p>
            <p className="text-2xl font-black tabular-nums">{Math.round(confidence * 100)}%</p>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/15" aria-hidden>
              <div
                className={cn("h-full rounded-full", confidence >= 0.71 ? "bg-sem-inteles" : "bg-sem-intrebare")}
                style={{ width: `${Math.round((stability ?? confidence) * 100)}%` }}
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
