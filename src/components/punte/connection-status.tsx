import { Loader2, Wifi, WifiOff } from "lucide-react";
import type { ConnectionState } from "@/hooks/use-lesson";
import { cn } from "@/lib/utils";

const LABELS = {
  teacher: "Profesor",
  student: "Elev",
  class: "Ecranul clasei",
} as const;

export function ConnectionStatus({
  connection,
  connected,
  show,
  dark,
  className,
}: {
  connection: ConnectionState;
  connected: { teacher: boolean; student: boolean; class: boolean };
  show: (keyof typeof LABELS)[];
  dark?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2 text-sm font-bold", className)} aria-live="polite">
      {connection !== "online" ? (
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5",
            connection === "reconnecting" ? "bg-sem-intrebare text-ink" : dark ? "bg-white/10 text-white" : "bg-white text-ink",
          )}
        >
          {connection === "reconnecting" ? (
            <WifiOff className="size-4" aria-hidden />
          ) : (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          )}
          {connection === "reconnecting" ? "Reconectare…" : "Se conectează…"}
        </span>
      ) : (
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5",
            dark ? "bg-white/10 text-white" : "bg-white text-ink",
          )}
        >
          <Wifi className="size-4 text-sem-inteles" aria-hidden />
          Online
        </span>
      )}
      {show.map((role) => (
        <span
          key={role}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5",
            dark ? "bg-white/10 text-white" : "bg-white text-ink",
            !connected[role] && "opacity-70",
          )}
        >
          <span
            aria-hidden
            className={cn("size-2.5 rounded-full", connected[role] ? "bg-sem-inteles" : "bg-sem-neutru")}
          />
          {LABELS[role]} {connected[role] ? "conectat" : "neconectat"}
        </span>
      ))}
    </div>
  );
}
