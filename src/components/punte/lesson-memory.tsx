"use client";

import { useState } from "react";
import { Check, Copy, NotebookPen, Sparkles, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { LessonSummary } from "@/lib/types";
import { cn } from "@/lib/utils";

export function summaryToText(summary: LessonSummary, title: string) {
  return [
    `Memoria lecției: ${title}`,
    "",
    "Idei principale:",
    ...summary.notes.map((n) => `• ${n}`),
    "",
    `Tema: ${summary.homework ?? "nu s-a anunțat temă"}`,
    "",
    "Termeni noi:",
    ...summary.terms.map((t) => `• ${t}`),
    "",
    "Pe scurt:",
    summary.simple_summary,
  ].join("\n");
}

/** Memoria lecției generată de AI: notițe, temă, termeni noi, rezumat simplu. */
export function LessonMemory({
  summary,
  title,
  dark,
  large,
  notice,
  className,
}: {
  summary: LessonSummary;
  title: string;
  dark?: boolean;
  large?: boolean;
  notice?: string | null;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(summaryToText(summary, title));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const card = dark ? "bg-white/5 border-white/15" : "bg-white border-border";
  const heading = cn("mb-2 font-display font-extrabold", large ? "text-3xl" : "text-xl");
  const body = large ? "text-2xl" : "text-lg";

  return (
    <section
      aria-labelledby="memoria-lectiei"
      className={cn("rounded-3xl border-2 p-5", dark ? "border-white/20 text-white" : "border-ink/10 bg-white/60", className)}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 id="memoria-lectiei" className={cn("flex items-center gap-2 font-display font-extrabold", large ? "text-4xl" : "text-2xl")}>
          <Sparkles className={cn(large ? "size-8" : "size-6", dark ? "text-[#FBBF24]" : "text-elev")} aria-hidden />
          Memoria lecției
        </h2>
        <Button variant={dark ? "secondary" : "outline"} onClick={copy} aria-live="polite">
          {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
          {copied ? "Copiat" : "Copiază"}
        </Button>
      </div>

      {notice || summary.fallback ? (
        <p
          className={cn(
            "mb-4 flex items-start gap-2 rounded-xl px-3 py-2 font-bold",
            dark ? "bg-[#F59E0B]/20 text-[#FDE68A]" : "bg-[#FEF3C7] text-[#78350F]",
          )}
          role="status"
        >
          <TriangleAlert className="mt-0.5 size-5 shrink-0" aria-hidden />
          {notice ?? "Rezumat generat local (fără AI): serviciul AI nu a răspuns."}
        </p>
      ) : null}

      <div className={cn("grid gap-4", large ? "lg:grid-cols-2" : "")}>
        <div className={cn("rounded-2xl border p-4", card)}>
          <h3 className={heading}>Pe scurt</h3>
          <p className={cn(body, "leading-relaxed")}>{summary.simple_summary}</p>
        </div>
        <div className={cn("rounded-2xl border p-4", card)}>
          <h3 className={heading}>Idei principale</h3>
          <ul className={cn("list-disc space-y-1.5 pl-6", body)}>
            {summary.notes.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        </div>
        <div className={cn("rounded-2xl border p-4", card)}>
          <h3 className={cn(heading, "flex items-center gap-2")}>
            <NotebookPen className="size-5" aria-hidden />
            Tema
          </h3>
          <p className={cn(body, "font-bold")}>{summary.homework ?? "Nu s-a anunțat temă."}</p>
        </div>
        <div className={cn("rounded-2xl border p-4", card)}>
          <h3 className={heading}>Termeni noi</h3>
          <ul className={cn("space-y-1.5", body)}>
            {summary.terms.map((t, i) => {
              const [term, ...rest] = t.split(":");
              return (
                <li key={i}>
                  <strong>{term}</strong>
                  {rest.length ? `:${rest.join(":")}` : null}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}
