"use client";

import { useEffect, useRef } from "react";
import { BookOpen, CircleHelp, Eye, Hand, Keyboard, Languages, Mic } from "lucide-react";
import type { Message } from "@/lib/types";
import { cn } from "@/lib/utils";

function time(iso: string) {
  return new Date(iso).toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" });
}

type Size = "md" | "lg" | "xl";

const TEXT: Record<Size, string> = {
  md: "text-lg",
  lg: "text-xl sm:text-2xl",
  xl: "text-3xl sm:text-4xl",
};
const SUB: Record<Size, string> = {
  md: "text-base",
  lg: "text-lg",
  xl: "text-2xl",
};

export interface StopProps {
  line: "prof" | "elev" | "system" | "live";
  time?: string;
  who?: string;
  icon?: React.ReactNode;
  chips?: React.ReactNode;
  text: string;
  /** Traducerea (pentru elev): devine textul principal, originalul rămâne dedesubt. */
  translation?: { text: string; lang: string } | null;
  alert?: boolean;
  size?: Size;
  dark?: boolean;
  animate?: boolean;
  srWho?: string;
}

const RAIL = { prof: "bg-prof", elev: "bg-elev", system: "", live: "" } as const;
const RAIL_DARK = { prof: "bg-prof-line", elev: "bg-elev-line", system: "", live: "" } as const;
const RING = { prof: "border-prof", elev: "border-elev", system: "border-sem-neutru", live: "border-prof" } as const;

/** O stație pe linie: ora (coloană fixă), linia cu punctul, apoi cine și ce a spus. */
export function RouteStop({ line, time: t, who, icon, chips, text, translation, alert, size = "md", dark, animate, srWho }: StopProps) {
  const system = line === "system";
  const live = line === "live";
  const rail = dark ? RAIL_DARK[line] : RAIL[line];
  return (
    <article
      className={cn(animate && "stop-in", "grid grid-cols-[2.9rem_1.5rem_minmax(0,1fr)] gap-x-2 sm:grid-cols-[3.4rem_1.75rem_minmax(0,1fr)]", size === "xl" && "sm:grid-cols-[5rem_2.25rem_minmax(0,1fr)]")}
      aria-label={live ? "Profesorul vorbește acum" : undefined}
    >
      <span className={cn("pt-1 text-right text-sm font-bold tabular", size === "xl" && "sm:text-xl", dark ? "text-white/55" : "text-muted-foreground")}>
        {t ? <time dateTime={t}>{time(t)}</time> : null}
      </span>
      <span aria-hidden className="relative flex justify-center">
        {/* segmentul de linie: continuu de la o stație la alta */}
        {system ? (
          <span className={cn("absolute inset-y-0 w-1", dark ? "bg-white/15" : "bg-steel/70")} />
        ) : live ? (
          <span className={cn("absolute inset-y-0 w-1", dark ? "rail-dashed opacity-70" : "rail-dashed opacity-50")} />
        ) : (
          <span className={cn("absolute inset-y-0 w-1", rail)} />
        )}
        <span
          style={{ ["--station" as string]: line === "elev" ? "#1747C4" : "#D4141C" }}
          className={cn(
            "relative z-10 mt-1.5 rounded-full border-4",
            system ? "size-3.5 border-[3px]" : "size-5",
            size === "xl" && !system && "sm:size-7 sm:border-[6px]",
            RING[line],
            alert ? (line === "elev" ? "bg-elev" : "bg-prof") : dark ? "bg-ink" : "bg-white",
            live && "live-dot",
            animate && !system && "station-arrive",
          )}
        />
      </span>
      <div className={cn("min-w-0 pb-4", size === "xl" && "pb-6")}>
        {who || chips ? (
          <header
            className={cn(
              "mb-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-bold",
              size === "xl" && "sm:text-lg",
              dark ? "text-white/70" : line === "elev" ? "text-elev" : line === "prof" || live ? "text-prof-dark" : "text-muted-foreground",
            )}
          >
            {icon}
            {who ? (
              <span>
                {who}
                {srWho ? <span className="sr-only">{srWho}</span> : null}
              </span>
            ) : null}
            {chips}
          </header>
        ) : null}
        {translation ? (
          <>
            <p lang={translation.lang} className={cn("font-bold leading-snug", TEXT[size], dark ? "text-white" : "text-ink")}>
              {translation.text}
            </p>
            <p lang="ro" className={cn("mt-1 flex items-start gap-1.5 leading-snug", SUB[size], dark ? "text-white/60" : "text-muted-foreground")}>
              <span className="plate mt-0.5 shrink-0 rounded bg-current/10 px-1 text-xs">RO</span>
              {text}
            </p>
          </>
        ) : (
          <p
            className={cn(
              "leading-snug",
              system ? "text-sm font-bold sm:text-base" : cn("font-bold", TEXT[size]),
              live && "italic",
              dark ? (live ? "text-white/65" : system ? "text-white/60" : "text-white") : live ? "text-muted-foreground" : system ? "text-muted-foreground" : "text-ink",
            )}
          >
            {text}
          </p>
        )}
      </div>
    </article>
  );
}

function Chip({ children, dark, tone }: { children: React.ReactNode; dark?: boolean; tone: "elev" | "neutral" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs",
        dark ? "bg-white/12 text-white" : tone === "elev" ? "bg-elev-soft text-elev-dark" : "bg-muted text-ink",
      )}
    >
      {children}
    </span>
  );
}

/**
 * Conversația ca o linie de metrou: profesorul pe linia roșie, elevul pe cea albastră,
 * fiecare replică e o stație, în ordinea timpului. Mesajele de sistem sunt halte mici.
 */
export function MessageList({
  messages,
  interim,
  dark,
  size = "md",
  emptyText = "Conversația apare aici.",
  className,
  translations,
  lang,
}: {
  messages: Message[];
  interim?: string;
  dark?: boolean;
  size?: Size;
  emptyText?: string;
  className?: string;
  /** id mesaj → traducere (doar pentru replicile profesorului). */
  translations?: Map<string, string>;
  lang?: string;
}) {
  const endRef = useRef<HTMLDivElement>(null);
  const firstRender = useRef(true);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: firstRender.current ? "auto" : "smooth", block: "end" });
    firstRender.current = false;
  }, [messages.length, interim, translations?.size]);

  const icon = "size-4" + (size === "xl" ? " sm:size-5" : "");

  return (
    <div className={cn("flex flex-col overflow-y-auto overscroll-contain pr-1", className)} role="log" aria-live="polite" aria-relevant="additions">
      {messages.length === 0 && !interim ? (
        <p className={cn("py-10 text-center text-lg", dark ? "text-white/60" : "text-muted-foreground")}>{emptyText}</p>
      ) : null}
      {messages.map((m) => {
        if (m.kind === "system") {
          return (
            <RouteStop
              key={m.id}
              line="system"
              time={m.created_at}
              size={size}
              dark={dark}
              animate
              icon={m.meta?.unknown ? <CircleHelp className={icon} aria-hidden /> : <Eye className={icon} aria-hidden />}
              text={m.meta?.unknown ? `${m.sender_name ?? "Elevul"}: semn necunoscut` : m.text}
            />
          );
        }
        const student = m.sender_role === "student";
        const Icon = m.kind === "sign" ? Hand : m.kind === "typed" ? Keyboard : Mic;
        const tr = !student && lang && lang !== "ro" ? translations?.get(m.id) : undefined;
        return (
          <RouteStop
            key={m.id}
            line={student ? "elev" : "prof"}
            time={m.created_at}
            size={size}
            dark={dark}
            animate
            alert={!!m.meta?.alert}
            icon={<Icon className={icon} aria-hidden />}
            who={m.sender_name ?? (student ? "Elev" : "Profesor")}
            srWho={student ? " (semne transformate în voce)" : " (voce transformată în text)"}
            chips={
              <>
                {m.kind === "sign" && m.meta?.word ? (
                  <Chip dark={dark} tone="elev">
                    <span className="sr-only">Semn: </span>
                    {m.meta.asl ? `ASL: ${m.meta.asl}` : m.meta.word}
                  </Chip>
                ) : null}
                {m.meta?.fromDictionary ? (
                  <Chip dark={dark} tone="elev">
                    <BookOpen className="size-3.5" aria-hidden />
                    termenul lecției
                  </Chip>
                ) : null}
                {tr ? (
                  <Chip dark={dark} tone="neutral">
                    <Languages className="size-3.5" aria-hidden />
                    tradus
                  </Chip>
                ) : null}
              </>
            }
            text={m.text}
            translation={tr ? { text: tr, lang: lang! } : null}
          />
        );
      })}
      {interim ? (
        <RouteStop line="live" size={size} dark={dark} icon={<Mic className={icon} aria-hidden />} who="Profesorul vorbește…" text={`${interim}…`} />
      ) : null}
      <div ref={endRef} />
    </div>
  );
}
