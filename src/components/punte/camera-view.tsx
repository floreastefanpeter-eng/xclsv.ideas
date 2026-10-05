"use client";

import { useState } from "react";
import { Camera, CameraOff, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TrackerStatus } from "@/hooks/use-hand-tracker";
import type { PrivacyStatus } from "@/hooks/use-face-privacy";
import { videoAspect } from "@/lib/camera";
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
  hint,
  privacyCanvasRef,
  privacy,
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
  /** Ghidul de încadrare: lumină, distanță, mâini în cadru. */
  hint?: string | null;
  /** Stratul cu fețele pixelate (toți în afară de elevul înregistrat). */
  privacyCanvasRef?: React.RefObject<HTMLCanvasElement | null>;
  privacy?: { status: PrivacyStatus; blurred: number; studentFound: boolean; registered: boolean };
  className?: string;
}) {
  const active = status === "ready" || status === "loading";
  // Până știm forma imaginii: 4:3. Apoi forma camerei; o imagine verticală (telefon ținut drept)
  // e tăiată ușor sus și jos, până la 3:4, ca rama să umple lățimea ecranului.
  const [aspect, setAspect] = useState(4 / 3);
  const frame = Math.max(aspect, 3 / 4);
  const syncAspect = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const a = videoAspect(e.currentTarget);
    if (a) setAspect(a);
  };
  return (
    <div
      className={cn("mx-auto overflow-hidden rounded-xl bg-ink text-white", className)}
      // Ramă și fundal au aceeași lățime: fără benzi negre laterale. Pe ecrane joase, înălțimea e limitată.
      style={{ width: `min(100%, calc(78svh * ${frame}))` }}
    >
      <div className="relative w-full bg-black" style={{ aspectRatio: String(frame) }}>
        <video
          ref={videoRef}
          playsInline
          muted
          onLoadedMetadata={syncAspect}
          onResize={syncAspect}
          className="mirror absolute inset-0 size-full object-cover"
          aria-hidden
        />
        {privacyCanvasRef ? (
          <canvas ref={privacyCanvasRef} className="mirror absolute inset-0 size-full object-cover" aria-hidden />
        ) : null}
        <canvas ref={canvasRef} className="mirror absolute inset-0 size-full object-cover" aria-hidden />
        {privacy && status === "ready" && privacy.status !== "active" ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-ink/80 p-6 text-center backdrop-blur-2xl" role="status">
            {privacy.status === "error" ? (
              <p className="font-bold">Protecția fețelor nu a pornit. Imaginea rămâne ascunsă; semnele sunt recunoscute în continuare.</p>
            ) : (
              <>
                <Loader2 className="size-7 animate-spin" aria-hidden />
                <p className="font-bold">Se pornește protecția fețelor… imaginea e ascunsă până atunci.</p>
              </>
            )}
          </div>
        ) : null}
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
            <span className="flex flex-col items-start gap-1">
              <span className="rounded-full bg-black/60 px-3 py-1.5 text-sm font-bold">
                {handsVisible === 0 ? "Nicio mână" : handsVisible === 1 ? "1 mână" : "2 mâini"}
              </span>
              {privacy?.status === "active" ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-black/60 px-3 py-1.5 text-sm font-bold">
                  <ShieldCheck className="size-4 text-white" aria-hidden />
                  {privacy.registered
                    ? `${privacy.studentFound ? "Elev recunoscut" : "Elevul nu e în cadru"} · ${privacy.blurred} fețe estompate`
                    : `${privacy.blurred} fețe estompate (fără înregistrare)`}
                </span>
              ) : null}
            </span>
            <Button size="sm" variant="secondary" onClick={onStop} className="bg-black/60 text-white hover:bg-black/80">
              <CameraOff aria-hidden />
              Oprește
            </Button>
          </div>
        ) : null}
        {status === "ready" && hint ? (
          <p className="absolute inset-x-3 bottom-3 rounded-lg bg-ink/90 px-3 py-2 text-center font-semibold text-white" role="status" aria-live="polite">
            {hint}
          </p>
        ) : null}
        {overlay}
      </div>
      {active ? (
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-white/60">Semn detectat</p>
            <p className="truncate font-display text-2xl font-semibold" aria-live="polite">
              {label ?? "—"}
            </p>
          </div>
          <div className="w-28 shrink-0 text-right">
            <p className="text-sm font-bold text-white/60">Încredere</p>
            <p className="text-2xl font-semibold tabular-nums">{Math.round(confidence * 100)}%</p>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/15" aria-hidden>
              <div
                className={cn("h-full rounded-full", confidence >= 0.71 ? "bg-white" : "bg-prof-line")}
                style={{ width: `${Math.round((stability ?? confidence) * 100)}%` }}
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
