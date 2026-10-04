"use client";

import { useMemo, useState } from "react";
import { Check, Copy, NotebookPen, NotebookText, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "@/hooks/use-translations";
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
  lang = "ro",
}: {
  summary: LessonSummary;
  title: string;
  dark?: boolean;
  large?: boolean;
  notice?: string | null;
  className?: string;
  /** Limba elevului: fiecare bucată apare tradusă, cu originalul dedesubt. */
  lang?: string;
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

  const items = useMemo(
    () => [
      { id: "sum", text: summary.simple_summary },
      ...summary.notes.map((n, i) => ({ id: `n${i}`, text: n })),
      ...(summary.homework ? [{ id: "hw", text: summary.homework }] : []),
      ...summary.terms.map((t, i) => ({ id: `t${i}`, text: t })),
    ],
    [summary],
  );
  const { translations } = useTranslations(items, lang);
  const sub = cn("mt-0.5 block text-[0.8em] font-normal", dark ? "text-white/55" : "text-muted-foreground");
  /** Traducerea (dacă există) + originalul românesc, mai mic. */
  const T = (id: string, text: string) => {
    const tr = translations.get(id);
    if (!tr) return <>{text}</>;
    return (
      <>
        <span lang={lang}>{tr}</span>
        <span lang="ro" className={sub}>
          {text}
        </span>
      </>
    );
  };

  const card = dark ? "bg-white/5 border-white/15" : "bg-white border-border";
  const heading = cn("mb-2 font-display font-extrabold", large ? "text-3xl" : "text-xl");
  const body = large ? "text-2xl" : "text-lg";

  return (
    <section
      aria-labelledby="memoria-lectiei"
      className={cn("rounded-xl border-2 p-5", dark ? "border-white/20 text-white" : "border-ink/10 bg-white/60", className)}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 id="memoria-lectiei" className={cn("flex items-center gap-2 font-display font-extrabold", large ? "text-4xl" : "text-2xl")}>
          <NotebookText className={cn(large ? "size-8" : "size-6", dark ? "text-amber" : "text-elev")} aria-hidden />
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
            dark ? "bg-amber/20 text-warn-soft" : "bg-warn-soft text-warn-ink",
          )}
          role="status"
        >
          <TriangleAlert className="mt-0.5 size-5 shrink-0" aria-hidden />
          {notice ?? "Rezumat generat local (fără AI): serviciul AI nu a răspuns."}
        </p>
      ) : null}

      <div className={cn("grid gap-4", large ? "lg:grid-cols-2" : "")}>
        <div className={cn("rounded-lg border p-4", card)}>
          <h3 className={heading}>Pe scurt</h3>
          <p className={cn(body, "leading-relaxed")}>
            {T("sum", summary.simple_summary)}
          </p>
        </div>
        <div className={cn("rounded-lg border p-4", card)}>
          <h3 className={heading}>Idei principale</h3>
          <ul className={cn("list-disc space-y-1.5 pl-6", body)}>
            {summary.notes.map((n, i) => (
              <li key={i}>
                {T(`n${i}`, n)}
              </li>
            ))}
          </ul>
        </div>
        <div className={cn("rounded-lg border p-4", card)}>
          <h3 className={cn(heading, "flex items-center gap-2")}>
            <NotebookPen className="size-5" aria-hidden />
            Tema
          </h3>
          <p className={cn(body, "font-bold")}>{summary.homework ? T("hw", summary.homework) : "Nu s-a anunțat temă."}</p>
        </div>
        <div className={cn("rounded-lg border p-4", card)}>
          <h3 className={heading}>Termeni noi</h3>
          <ul className={cn("space-y-1.5", body)}>
            {summary.terms.map((t, i) => {
              const [term, ...rest] = t.split(":");
              const tr = translations.get(`t${i}`);
              return (
                <li key={i}>
                  {tr ? (
                    <span lang={lang} className="block font-bold">
                      {tr}
                    </span>
                  ) : null}
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
