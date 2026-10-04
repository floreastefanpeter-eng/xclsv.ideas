"use client";

import { useEffect, useState } from "react";
import { Hand, Sparkles } from "lucide-react";
import { ConnectionStatus } from "@/components/punte/connection-status";
import { LessonMemory } from "@/components/punte/lesson-memory";
import { Logo } from "@/components/punte/logo";
import { MessageList } from "@/components/punte/message-list";
import { Semafor } from "@/components/punte/semafor";
import { ErrorScreen, LoadingScreen } from "@/components/punte/screen-state";
import { useLesson } from "@/hooks/use-lesson";
import type { SemaforState } from "@/lib/types";

/** Ecranul clasei: proiectat pe tablă, doar afișare, text foarte mare. */
export default function ClassScreen({ code }: { code: string }) {
  const api = useLesson(code, "class");
  const { lesson, messages, summary, on, connection, connected } = api;
  const [semafor, setSemafor] = useState<SemaforState>("neutru");
  const [interim, setInterim] = useState("");
  const [pending, setPending] = useState<string | null>(null);

  useEffect(() => {
    const offs = [
      on("semafor", ({ state }) => setSemafor(state)),
      on("caption_interim", ({ text }) => setInterim(text)),
      on("pending_sign", ({ text }) => setPending(text)),
      on("pending_cancel", () => setPending(null)),
    ];
    return () => offs.forEach((off) => off());
  }, [on]);

  const { onMessage } = api;
  useEffect(
    () =>
      onMessage((m) => {
        if (m.sender_role === "teacher") setInterim("");
        else setPending(null);
      }),
    [onMessage],
  );

  if (api.error) return <ErrorScreen message={api.error} dark />;
  if (!lesson) return <LoadingScreen dark />;

  const ended = lesson.status === "ended" || !!summary;

  return (
    <main className="flex min-h-dvh flex-1 flex-col gap-5 bg-[#0B1220] px-5 py-5 text-white lg:px-10">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-5">
          <Logo dark />
          <div>
            <p className="text-lg font-bold uppercase tracking-wider text-white/60">{lesson.subject}</p>
            <h1 className="font-display text-4xl font-extrabold leading-tight lg:text-5xl">{lesson.title}</h1>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className="rounded-xl bg-white/10 px-4 py-2 font-mono text-2xl font-black tracking-[0.25em]">{lesson.code}</span>
          <ConnectionStatus connection={connection} connected={connected} show={["teacher", "student"]} dark />
        </div>
      </header>

      <div className="grid flex-1 gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <section aria-label="Conversația live" className="flex min-h-0 flex-col rounded-3xl bg-white/5 p-5">
          <div className="mb-4 flex flex-wrap gap-4 text-lg font-bold">
            <span className="inline-flex items-center gap-2">
              <span className="size-4 rounded-full bg-[#60A5FA]" aria-hidden />
              {lesson.student_name}: semne → voce
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="size-4 rounded-full bg-[#FB923C]" aria-hidden />
              Profesor: voce → text
            </span>
          </div>
          <MessageList
            messages={messages.slice(-40)}
            interim={interim}
            dark
            size="xl"
            className="max-h-[68dvh] flex-1"
            emptyText="Conversația lecției apare aici."
          />
          {pending ? (
            <p className="mt-4 flex items-center gap-3 self-end rounded-2xl bg-[#1E3A8A] px-5 py-3 text-2xl font-bold" role="status">
              <Hand className="size-7" aria-hidden />
              {lesson.student_name} semnează…
            </p>
          ) : null}
        </section>

        <aside className="flex flex-col gap-5">
          <section aria-label="Semaforul elevului" className="rounded-3xl bg-white/5 p-5">
            <h2 className="mb-3 font-display text-2xl font-extrabold">{lesson.student_name}</h2>
            <Semafor state={pending ? "semneaza" : semafor} dark size="lg" className="sm:grid-cols-2" />
          </section>
          <section aria-label="Context AI" className="rounded-3xl bg-white/5 p-5">
            <h2 className="mb-3 flex items-center gap-2 font-display text-2xl font-extrabold">
              <Sparkles className="size-6 text-[#FBBF24]" aria-hidden />
              Context AI
            </h2>
            <p className="mb-3 text-lg text-white/70">Termenii lecției, în dicționarul clasei:</p>
            <ul className="flex flex-wrap gap-2">
              {lesson.terms.map((t) => (
                <li key={t} className="rounded-full bg-[#1E3A8A] px-4 py-2 text-2xl font-bold">
                  {t}
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>

      {ended && summary ? <LessonMemory summary={summary} title={lesson.title} dark large /> : null}
    </main>
  );
}
