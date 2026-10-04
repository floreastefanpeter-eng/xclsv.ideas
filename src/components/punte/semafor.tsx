import { SEMAFOR_META } from "@/lib/signs";
import type { SemaforState } from "@/lib/types";
import { cn } from "@/lib/utils";

const ORDER: SemaforState[] = ["semneaza", "intrebare", "inteles", "neinteles"];

/** Semaforul elevului: albastru, chihlimbar, verde, roșu — fiecare cu etichetă. */
export function Semafor({
  state,
  dark,
  size = "md",
  className,
}: {
  state: SemaforState;
  dark?: boolean;
  size?: "md" | "lg";
  className?: string;
}) {
  return (
    <div
      className={cn("grid grid-cols-2 gap-2 sm:grid-cols-4", size === "lg" && "gap-3", className)}
      role="status"
      aria-live="polite"
      aria-label={`Semaforul elevului: ${SEMAFOR_META[state].label}`}
    >
      {ORDER.map((s) => {
        const active = s === state;
        const meta = SEMAFOR_META[s];
        return (
          <div
            key={s}
            className={cn(
              "flex items-center gap-2.5 rounded-lg border-2 px-3 py-2 transition-colors",
              size === "lg" && "flex-col justify-center px-2 py-4 text-center",
              dark
                ? active
                  ? "border-white/80 bg-white/10 text-white"
                  : "border-white/10 text-white/40"
                : active
                  ? "border-ink bg-white text-ink"
                  : "border-transparent bg-white/50 text-ink/45",
            )}
            aria-hidden={!active}
          >
            <span
              className={cn("led shrink-0 rounded-full", size === "lg" ? "size-16" : "size-6", active && "led-pulse")}
              style={{
                ["--led" as string]: meta.color,
                opacity: active ? 1 : 0.28,
                boxShadow: active ? undefined : "none",
              }}
            />
            <span className={cn("font-bold leading-tight", size === "lg" ? "text-2xl" : "text-sm")}>{meta.short}</span>
          </div>
        );
      })}
    </div>
  );
}
