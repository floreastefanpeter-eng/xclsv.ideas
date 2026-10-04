"use client";

import { useEffect, useRef } from "react";
import { BookOpen, Hand, Keyboard, Mic } from "lucide-react";
import type { Message } from "@/lib/types";
import { cn } from "@/lib/utils";

function time(iso: string) {
  return new Date(iso).toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" });
}

/** Conversația în două culori: elev (semne → voce) și profesor (voce → text). */
export function MessageList({
  messages,
  interim,
  dark,
  size = "md",
  emptyText = "Conversația apare aici.",
  className,
}: {
  messages: Message[];
  interim?: string;
  dark?: boolean;
  size?: "md" | "lg" | "xl";
  emptyText?: string;
  className?: string;
}) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, interim]);

  const textSize = size === "xl" ? "text-3xl sm:text-4xl" : size === "lg" ? "text-2xl" : "text-lg";

  return (
    <div className={cn("flex flex-col gap-3 overflow-y-auto", className)} role="log" aria-live="polite" aria-relevant="additions">
      {messages.length === 0 && !interim ? (
        <p className={cn("py-8 text-center text-lg", dark ? "text-white/60" : "text-muted-foreground")}>{emptyText}</p>
      ) : null}
      {messages.map((m) => {
        const student = m.sender_role === "student";
        const Icon = m.kind === "sign" ? Hand : m.kind === "typed" ? Keyboard : Mic;
        return (
          <article
            key={m.id}
            className={cn(
              "max-w-[92%] rounded-2xl border-l-8 px-4 py-3",
              student ? "self-end" : "self-start",
              dark
                ? student
                  ? "border-[#60A5FA] bg-[#1E3A8A]/70 text-white"
                  : "border-[#FB923C] bg-[#7C2D12]/60 text-white"
                : student
                  ? "border-elev bg-elev-soft text-ink"
                  : "border-prof bg-prof-soft text-ink",
            )}
          >
            <header
              className={cn(
                "mb-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-bold",
                dark ? "text-white/75" : student ? "text-elev" : "text-prof-dark",
              )}
            >
              <Icon className="size-4" aria-hidden />
              <span>
                {m.sender_name ?? (student ? "Elev" : "Profesor")}
                <span className="sr-only">{student ? " (semne transformate în voce)" : " (voce transformată în text)"}</span>
              </span>
              <span aria-hidden>·</span>
              <time dateTime={m.created_at}>{time(m.created_at)}</time>
              {m.meta?.fromDictionary ? (
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs",
                    dark ? "bg-white/15 text-white" : "bg-white text-elev",
                  )}
                >
                  <BookOpen className="size-3.5" aria-hidden />
                  din dicționarul clasei
                </span>
              ) : null}
            </header>
            <p className={cn("font-bold leading-snug", textSize)}>{m.text}</p>
          </article>
        );
      })}
      {interim ? (
        <article
          className={cn(
            "max-w-[92%] self-start rounded-2xl border-l-8 border-dashed px-4 py-3",
            dark ? "border-white/40 bg-white/5 text-white/60" : "border-prof/40 bg-white text-muted-foreground",
          )}
          aria-label="Profesorul vorbește"
        >
          <p className={cn("font-bold italic leading-snug", textSize)}>{interim}…</p>
        </article>
      ) : null}
      <div ref={endRef} />
    </div>
  );
}
