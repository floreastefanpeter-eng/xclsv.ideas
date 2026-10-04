import { SEMAFOR_META } from "@/lib/signs";
import type { SemaforState } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Insigna (elev = albastru, profesor = portocaliu) cu LED-ul semafor.
 * Culoarea are mereu și o etichetă text.
 */
export function Insigna({
  variant,
  title,
  subtitle,
  state,
  pulse,
  alert,
  children,
  className,
}: {
  variant: "elev" | "prof";
  title: string;
  subtitle?: string;
  state: SemaforState;
  pulse?: boolean;
  alert?: boolean;
  children?: React.ReactNode;
  className?: string;
}) {
  const meta = SEMAFOR_META[state];
  return (
    <section
      aria-label={title}
      className={cn(
        "relative overflow-hidden rounded-3xl p-4 text-white shadow-lg sm:p-5",
        variant === "elev" ? "bg-elev" : "bg-gradient-to-br from-prof to-prof-dark",
        alert && "badge-alert ring-4 ring-sem-neinteles",
        className,
      )}
    >
      {/* clema insignei */}
      <div aria-hidden className="absolute left-1/2 top-2 h-1.5 w-12 -translate-x-1/2 rounded-full bg-white/35" />
      <div className="flex items-center gap-4 pt-2">
        <div
          className={cn("led size-14 shrink-0 rounded-full border-4 border-white/80 sm:size-16", pulse && "led-pulse")}
          style={{ ["--led" as string]: meta.color }}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold uppercase tracking-wider text-white/80">{subtitle}</p>
          <h1 className="truncate font-display text-2xl font-extrabold leading-tight sm:text-3xl">{title}</h1>
          <p className="mt-0.5 text-lg font-bold" role="status" aria-live="polite">
            <span className="sr-only">Stare: </span>
            {meta.label}
          </p>
        </div>
      </div>
      {children ? <div className="mt-4">{children}</div> : null}
    </section>
  );
}
