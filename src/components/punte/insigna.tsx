import { SEMAFOR_META } from "@/lib/signs";
import type { SemaforState } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Insigna: plăcuța liniei (elev = albastru, profesor = roșu) cu LED-ul semaforului.
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
        "relative overflow-hidden rounded-xl p-4 text-white shadow-[0_14px_30px_-18px_rgba(13,22,38,0.6)] sm:p-5",
        variant === "elev" ? "bg-elev" : "bg-prof",
        alert && "badge-alert ring-4 ring-amber",
        className,
      )}
    >
      <div className="flex items-center gap-4">
        <div
          className={cn("led size-14 shrink-0 rounded-full border-4 border-white/85 sm:size-16", pulse && "led-pulse")}
          style={{ ["--led" as string]: meta.color }}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <h1 className="plate truncate text-3xl leading-none sm:text-4xl">{title}</h1>
          <p className="mt-1.5 text-lg font-bold" role="status" aria-live="polite">
            <span className="sr-only">Stare: </span>
            {meta.label}
            {subtitle ? <span className="font-normal text-white/80"> · {subtitle}</span> : null}
          </p>
        </div>
      </div>
      {children ? <div className="mt-4">{children}</div> : null}
    </section>
  );
}
