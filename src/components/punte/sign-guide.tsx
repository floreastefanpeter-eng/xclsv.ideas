"use client";

import { useMemo, useState } from "react";
import { BookOpen, ExternalLink, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ASL_CLASSROOM_GLOSSES, ASL_RO, aslToSign } from "@/lib/asl/glossary";
import { aslReferenceUrl, dlmgSearchUrl } from "@/lib/asl/references";
import { CATEGORY_LABELS, type SignDef } from "@/lib/signs";
import { cn } from "@/lib/utils";

type Tab = "asl" | "dictionar";

function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

/**
 * Ghidul semnelor: cele 250 de semne ASL pe care le recunoaște modelul (cu traducerea în română)
 * și dicționarul elevului. Fiecare cuvânt are link la video-ul ASL și la căutarea în DLMG (LSR).
 */
export function SignGuide({
  dictionary,
  trained,
  onPick,
  className,
}: {
  dictionary?: SignDef[];
  trained?: Set<string>;
  /** Dacă e setat, cuvintele pot fi trimise direct (plasa de siguranță). */
  onPick?: (sign: SignDef) => void;
  className?: string;
}) {
  const [tab, setTab] = useState<Tab>("asl");
  const [query, setQuery] = useState("");
  const q = normalize(query.trim());

  const aslList = useMemo(() => {
    const classroom = new Set(ASL_CLASSROOM_GLOSSES);
    return Object.keys(ASL_RO)
      .map((gloss) => ({ gloss, sign: aslToSign(gloss), classroom: classroom.has(gloss) }))
      .filter(({ gloss, sign }) => !q || normalize(gloss).includes(q) || normalize(sign.word).includes(q))
      .sort((a, b) => Number(b.classroom) - Number(a.classroom) || a.sign.word.localeCompare(b.sign.word, "ro"));
  }, [q]);

  const dictList = useMemo(
    () => (dictionary ?? []).filter((s) => !q || normalize(s.word).includes(q) || normalize(s.phrase).includes(q)),
    [dictionary, q],
  );

  const tabBtn = (id: Tab, label: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={tab === id}
      onClick={() => setTab(id)}
      className={cn(
        "min-h-11 flex-1 rounded-xl px-3 font-bold",
        tab === id ? "bg-ink text-white" : "bg-muted text-ink hover:bg-muted/70",
      )}
    >
      {label}
    </button>
  );

  return (
    <section aria-labelledby="ghid-semne" className={cn("rounded-xl bg-white p-4 border border-border", className)}>
      <h2 id="ghid-semne" className="mb-1 flex items-center gap-2 font-display text-xl font-extrabold">
        <BookOpen className="size-5" aria-hidden />
        Ghidul semnelor
      </h2>
      <p className="mb-3 text-sm text-muted-foreground">
        Modelul recunoaște semne <strong>ASL</strong> (limbajul american). Pentru semnul românesc (LSR), deschide căutarea în DLMG.
      </p>
      <div className="mb-3 flex gap-2" role="tablist">
        {tabBtn("asl", `Model ASL (${Object.keys(ASL_RO).length})`)}
        {dictionary ? tabBtn("dictionar", `Dicționarul meu (${dictionary.length})`) : null}
      </div>
      <label className="relative mb-3 block">
        <span className="sr-only">Caută un semn</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Caută: apă, carte, de ce…" className="pl-10" />
      </label>

      <ul className="max-h-[420px] space-y-2 overflow-y-auto pr-1" role="tabpanel">
        {tab === "asl"
          ? aslList.map(({ gloss, sign, classroom }) => (
              <li key={gloss} className="flex flex-wrap items-center gap-2 rounded-lg border border-border p-3">
                <div className="min-w-0 flex-1">
                  <p className="font-bold">
                    {sign.word}{" "}
                    <span className="font-mono text-sm font-normal text-muted-foreground">ASL: {gloss}</span>
                  </p>
                  {classroom ? (
                    <p className="text-sm text-elev">
                      În clasă: „{sign.phrase}”{sign.alert ? " · alertă la profesor" : ""}
                    </p>
                  ) : null}
                </div>
                <a
                  href={aslReferenceUrl(gloss)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-11 items-center gap-1 rounded-xl px-2 text-sm font-bold text-elev underline-offset-2 hover:underline"
                >
                  Video ASL <ExternalLink className="size-3.5" aria-hidden />
                  <span className="sr-only">(se deschide într-o filă nouă)</span>
                </a>
                <a
                  href={dlmgSearchUrl(ASL_RO[gloss])}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-11 items-center gap-1 rounded-xl px-2 text-sm font-bold text-prof-dark underline-offset-2 hover:underline"
                >
                  LSR (DLMG) <ExternalLink className="size-3.5" aria-hidden />
                  <span className="sr-only">(se deschide într-o filă nouă)</span>
                </a>
                {onPick ? (
                  <button
                    type="button"
                    onClick={() => onPick(sign)}
                    className="min-h-11 rounded-xl bg-elev px-3 text-sm font-bold text-white hover:bg-elev/90"
                  >
                    Trimite
                  </button>
                ) : null}
              </li>
            ))
          : dictList.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-border p-3">
                <div className="min-w-0 flex-1">
                  <p className="font-bold">
                    {s.word}{" "}
                    <span className="text-sm font-normal text-muted-foreground">{CATEGORY_LABELS[s.category]}</span>
                  </p>
                  <p className="text-sm text-elev">
                    „{s.phrase}” · {trained?.has(s.id) ? "antrenat" : "neantrenat"}
                  </p>
                </div>
                <a
                  href={dlmgSearchUrl(s.word)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-11 items-center gap-1 rounded-xl px-2 text-sm font-bold text-prof-dark underline-offset-2 hover:underline"
                >
                  LSR (DLMG) <ExternalLink className="size-3.5" aria-hidden />
                  <span className="sr-only">(se deschide într-o filă nouă)</span>
                </a>
                {onPick ? (
                  <button
                    type="button"
                    onClick={() => onPick(s)}
                    className="min-h-11 rounded-xl bg-elev px-3 text-sm font-bold text-white hover:bg-elev/90"
                  >
                    Trimite
                  </button>
                ) : null}
              </li>
            ))}
        {(tab === "asl" ? aslList.length : dictList.length) === 0 ? (
          <li className="py-6 text-center text-muted-foreground">Niciun semn găsit.</li>
        ) : null}
      </ul>
    </section>
  );
}
