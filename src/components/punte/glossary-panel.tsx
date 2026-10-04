"use client";

import { useMemo } from "react";
import { BookA } from "lucide-react";
import { Panel } from "@/components/punte/station-band";
import { useTranslations } from "@/hooks/use-translations";
import type { GlossaryEntry, Lesson } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Termenii lecției: cei scriși de profesor (dacă există) + cei extrași automat, cu explicații simple. */
/** Zgomotul recunoașterii vocale („mmm”, „m”) nu e un termen. */
function isNoise(term: string) {
  const letters = term.toLowerCase().replace(/[^p{L}]/gu, "");
  return letters.length < 3 || new Set(letters).size === 1;
}

export function lessonGlossary(lesson: Pick<Lesson, "terms" | "glossary">): GlossaryEntry[] {
  const auto = (Array.isArray(lesson.glossary) ? lesson.glossary : []).filter((g) => !isNoise(g.term));
  const known = new Set(auto.map((g) => g.term.toLowerCase()));
  const manual = lesson.terms.filter((t) => !known.has(t.toLowerCase()) && !isNoise(t)).map((term) => ({ term, explanation: "" }));
  return [...manual, ...auto];
}

export function GlossaryPanel({
  lesson,
  lang = "ro",
  dark,
  large,
  className,
  emptyText = "Termenii-cheie apar aici pe măsură ce profesorul vorbește.",
  action,
}: {
  lesson: Pick<Lesson, "terms" | "glossary">;
  lang?: string;
  dark?: boolean;
  large?: boolean;
  className?: string;
  emptyText?: string;
  action?: React.ReactNode;
}) {
  const entries = useMemo(() => lessonGlossary(lesson), [lesson]);
  const items = useMemo(
    () =>
      entries.flatMap((e) => [
        { id: `t:${e.term}`, text: e.term },
        ...(e.explanation ? [{ id: `x:${e.term}`, text: e.explanation }] : []),
      ]),
    [entries],
  );
  const { translations } = useTranslations(items, lang);

  return (
    <Panel id="termeni" dark={dark} className={className} title="Termenii lecției" icon={<BookA className="size-5" aria-hidden />} action={action}>
      {entries.length === 0 ? (
        <p className={cn(large ? "text-xl" : "text-base", dark ? "text-white/60" : "text-muted-foreground")}>{emptyText}</p>
      ) : (
        <dl className="flex flex-col gap-3">
          {entries.map((e) => {
            const term = translations.get(`t:${e.term}`);
            const explanation = translations.get(`x:${e.term}`);
            return (
              <div key={e.term}>
                <dt className={cn("font-display font-semibold leading-tight", large ? "text-3xl" : "text-xl", dark ? "text-white" : "text-ink")}>
                  {e.term}
                  {term ? (
                    <span lang={lang} className={cn("ml-2 font-sans font-bold", large ? "text-2xl" : "text-lg", dark ? "text-elev-line" : "text-elev")}>
                      {term}
                    </span>
                  ) : null}
                </dt>
                {e.explanation ? (
                  <dd className={cn("mt-0.5 leading-snug", large ? "text-xl" : "text-base", dark ? "text-white/75" : "text-ink/80")}>
                    {explanation ? (
                      <>
                        <span lang={lang} className="block">
                          {explanation}
                        </span>
                        <span lang="ro" className={cn("block text-sm", dark ? "text-white/50" : "text-muted-foreground")}>
                          {e.explanation}
                        </span>
                      </>
                    ) : (
                      e.explanation
                    )}
                  </dd>
                ) : null}
              </div>
            );
          })}
        </dl>
      )}
    </Panel>
  );
}
