"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { cn } from "@/lib/utils";

/** Codul QR care deschide /j/[code] + codul lecției, mare și lizibil. */
export function LessonQr({ code, size = 220, className }: { code: string; size?: number; className?: string }) {
  const [origin] = useState(() => (typeof window === "undefined" ? "" : window.location.origin));
  const url = `${origin}/j/${code}`;
  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      <div className="rounded-2xl bg-white p-3 shadow-sm">
        {origin ? (
          <QRCodeSVG value={url} size={size} level="M" marginSize={1} title={`Cod QR pentru lecția ${code}`} />
        ) : (
          <div style={{ width: size, height: size }} />
        )}
      </div>
      <p className="text-center">
        <span className="block text-sm font-bold uppercase tracking-wider text-muted-foreground">Codul lecției</span>
        <span className="font-mono text-4xl font-black tracking-[0.25em]" aria-label={code.split("").join(" ")}>
          {code}
        </span>
      </p>
      {origin ? <p className="break-all text-center text-sm text-muted-foreground">{url}</p> : null}
    </div>
  );
}
