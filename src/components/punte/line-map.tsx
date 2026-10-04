import { Loader2, WifiOff } from "lucide-react";
import type { ConnectionState } from "@/hooks/use-lesson";
import { cn } from "@/lib/utils";

export interface Station {
  key: string;
  label: string;
  /** Linia stației: roșu = profesor, negru = elev și ecranele lui, gri = ecranul clasei. */
  line: "prof" | "elev" | "ink";
  on: boolean;
  /** Ecranul pe care ești acum („Ești aici”). */
  here?: boolean;
}

const COLOR = { prof: "var(--color-prof)", elev: "var(--color-elev)", ink: "var(--color-sem-neutru)" } as const;
const DOT = {
  prof: "border-prof bg-prof",
  elev: "border-elev bg-elev",
  ink: "border-sem-neutru bg-sem-neutru",
} as const;

/** Linia continuă din spatele stațiilor: fiecare segment are culoarea liniei care pleacă din stație. */
function lineGradient(stations: Station[], dark?: boolean) {
  const n = stations.length;
  const stops: string[] = [];
  for (let i = 0; i < n - 1; i++) {
    const a = stations[i];
    const b = stations[i + 1];
    const color = a.line === "prof" ? COLOR.prof : b.line === "ink" ? COLOR.ink : dark ? "var(--color-elev-line)" : COLOR.elev;
    const from = (i / (n - 1)) * 100;
    const to = ((i + 1) / (n - 1)) * 100;
    stops.push(`${color} ${from}%`, `${color} ${to}%`);
  }
  return `linear-gradient(to right, ${stops.join(", ")})`;
}

/**
 * Harta liniei: dispozitivele lecției sunt stații pe linia roșie (profesorul) și albastră (elevul).
 * Plin = conectat, gol = neconectat, inel = ești aici.
 */
export function LineMap({
  stations,
  connection,
  dark,
  className,
}: {
  stations: Station[];
  connection: ConnectionState;
  dark?: boolean;
  className?: string;
}) {
  const n = stations.length;
  return (
    <div className={cn("flex min-w-0 items-center gap-3", className)}>
      {connection !== "online" ? (
        <span
          role="status"
          className={cn(
            "inline-flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1 text-sm font-bold",
            connection === "reconnecting" ? "bg-amber text-ink" : dark ? "bg-white/10 text-white" : "bg-white text-ink",
          )}
        >
          {connection === "reconnecting" ? <WifiOff className="size-4" aria-hidden /> : <Loader2 className="size-4 animate-spin" aria-hidden />}
          <span className="hidden sm:inline">{connection === "reconnecting" ? "Reconectare…" : "Se conectează…"}</span>
        </span>
      ) : null}
      <ol className="relative flex min-w-0 flex-1" aria-label="Dispozitivele lecției">
        <span
          aria-hidden
          className="absolute top-[8px] h-1 rounded-full"
          style={{ left: `${50 / n}%`, right: `${50 / n}%`, background: lineGradient(stations, dark) }}
        />
        {stations.map((s) => (
          <li key={s.key} className="relative flex min-w-0 flex-1 flex-col items-center gap-1">
            <span
              aria-hidden
              className={cn(
                "relative size-5 rounded-full border-4 transition-colors duration-300",
                s.on ? (dark && s.line === "elev" ? "border-white bg-white" : DOT[s.line]) : dark ? "border-white/50 bg-ink" : "border-steel bg-white",
                s.here && (dark ? "ring-2 ring-white ring-offset-2 ring-offset-ink" : "ring-2 ring-ink ring-offset-2 ring-offset-background"),
              )}
            />
            <span
              className={cn(
                "max-w-full truncate px-0.5 text-xs font-bold leading-tight sm:text-sm",
                dark ? "text-white" : "text-ink",
                !s.on && (dark ? "text-white/60" : "text-muted-foreground"),
              )}
            >
              {s.label}
              <span className="sr-only">{s.here ? ", ești aici" : s.on ? ", conectat" : ", neconectat"}</span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
