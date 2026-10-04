"use client";

import { BellRing, CircleHelp, NotebookPen, UserRound } from "lucide-react";
import { BUZZ_META } from "@/lib/signs";
import type { BuzzKind } from "@/lib/types";
import { cn } from "@/lib/utils";

const ICONS = { nume: UserRound, intrebare: CircleHelp, tema: NotebookPen, atentie: BellRing } as const;
const COLORS: Record<BuzzKind, string> = {
  nume: "bg-ink text-white",
  intrebare: "bg-ink text-white",
  tema: "bg-ink text-white",
  atentie: "bg-prof text-white",
};

/** Alerta vizuală care însoțește vibrația (pe iOS e singurul efect). */
export function BuzzBanner({ buzz }: { buzz: { kind: BuzzKind; text?: string; id: number } | null }) {
  if (!buzz) return null;
  const Icon = ICONS[buzz.kind];
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center p-3">
      <div
        key={buzz.id}
        role="alert"
        className={cn("buzz-shake flex w-full max-w-xl items-center gap-3 rounded-xl px-5 py-4 shadow-2xl", COLORS[buzz.kind])}
      >
        <Icon className="size-10 shrink-0" aria-hidden />
        <div className="min-w-0">
          <p className="font-display text-2xl font-semibold leading-tight">{BUZZ_META[buzz.kind].label}</p>
          {buzz.text ? <p className="truncate text-lg font-bold opacity-90">{buzz.text}</p> : null}
        </div>
      </div>
    </div>
  );
}

export function vibrate(kind: BuzzKind) {
  try {
    navigator.vibrate?.(BUZZ_META[kind].pattern);
  } catch {
    // iOS nu suportă vibrația din browser: rămâne doar efectul vizual
  }
}
