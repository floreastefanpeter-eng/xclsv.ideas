"use client";

import { useMemo } from "react";
import { CircleCheck, CircleDashed, CircleX, Download, FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { computeStats, evaluateHypotheses, statsToCsv } from "@/lib/stats";
import type { Message } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Statisticile lecției și ipotezele testate — calculate din conversația reală. */
export function LessonStatsPanel({
  messages,
  code,
  dark,
  exportable,
  className,
}: {
  messages: Message[];
  code: string;
  dark?: boolean;
  exportable?: boolean;
  className?: string;
}) {
  const stats = useMemo(() => computeStats(messages), [messages]);
  const hypotheses = useMemo(() => evaluateHypotheses(stats), [stats]);

  const download = () => {
    const blob = new Blob([statsToCsv(code, stats, hypotheses)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `punte-lectie-${code}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const tiles: [string, string][] = [
    ["Semne trimise", String(stats.signsSent)],
    ["Prin cameră", String(stats.signsCamera)],
    ["Semne necunoscute", String(stats.unknown)],
    ["Alerte", String(stats.alerts)],
    ["Reacția profesorului", stats.medianAckMs === null ? "—" : `${(stats.medianAckMs / 1000).toFixed(1)} s`],
    ["Încredere medie", stats.avgConfidence === null ? "—" : `${Math.round(stats.avgConfidence * 100)}%`],
  ];

  return (
    <section
      aria-labelledby="stats-title"
      className={cn("rounded-xl border-2 p-5", dark ? "border-white/20 text-white" : "border-ink/10 bg-white/60", className)}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 id="stats-title" className="flex items-center gap-2 font-display text-2xl font-semibold">
          <FlaskConical className={cn("size-6", dark ? "text-elev-line" : "text-elev")} aria-hidden />
          Statistici și ipoteze
        </h2>
        {exportable ? (
          <Button variant={dark ? "secondary" : "outline"} onClick={download}>
            <Download aria-hidden />
            Descarcă CSV
          </Button>
        ) : null}
      </div>
      <dl className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {tiles.map(([label, value]) => (
          <div key={label} className={cn("rounded-lg p-3", dark ? "bg-white/5" : "bg-white")}>
            <dt className={cn("text-sm font-bold", dark ? "text-white/70" : "text-muted-foreground")}>{label}</dt>
            <dd className="font-display text-3xl font-semibold tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
      <ul className="space-y-2">
        {hypotheses.map((h) => {
          const Icon = h.passed === null ? CircleDashed : h.passed ? CircleCheck : CircleX;
          return (
            <li key={h.id} className={cn("flex items-start gap-3 rounded-lg p-3", dark ? "bg-white/5" : "bg-white")}>
              <Icon
                className={cn(
                  "mt-0.5 size-6 shrink-0",
                  h.passed === null ? "text-sem-neutru" : h.passed ? "text-ink" : "text-prof",
                )}
                aria-hidden
              />
              <div>
                <p className="font-bold">
                  {h.id}. {h.text}
                </p>
                <p className={cn("text-sm", dark ? "text-white/70" : "text-muted-foreground")}>
                  Țintă {h.target} · {h.metric} ·{" "}
                  <strong>{h.passed === null ? "date insuficiente" : h.passed ? "confirmată" : "infirmată"}</strong>
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
