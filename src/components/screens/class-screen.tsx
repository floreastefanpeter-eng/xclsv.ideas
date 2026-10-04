"use client";

import { useEffect, useState } from "react";
import { Hand } from "lucide-react";
import { GlossaryPanel } from "@/components/punte/glossary-panel";
import { LessonMemory } from "@/components/punte/lesson-memory";
import { LessonStatsPanel } from "@/components/punte/lesson-stats";
import { LineMap } from "@/components/punte/line-map";
import { MessageList } from "@/components/punte/message-list";
import { Semafor } from "@/components/punte/semafor";
import { ErrorScreen, LoadingScreen } from "@/components/punte/screen-state";
import { StationBand } from "@/components/punte/station-band";
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
    <div className="dark-surface flex min-h-dvh flex-1 flex-col bg-night text-white">
      <StationBand logoHref={`/j/${lesson.code}`} sticky={false}>
        <div className="flex min-w-0 items-center gap-5">
          <h1 className="min-w-0 truncate font-display text-2xl font-extrabold leading-tight sm:text-4xl">
            {lesson.title}
            <span className="ml-3 hidden text-lg font-bold text-white/60 sm:inline">{lesson.subject}</span>
          </h1>
          <span className="code-cells ml-auto hidden rounded bg-white/10 px-3 py-1.5 text-2xl md:inline" aria-label={`Codul lecției ${lesson.code.split("").join(" ")}`}>
            {lesson.code}
          </span>
        </div>
      </StationBand>

      <main className="grid flex-1 gap-5 px-4 py-5 sm:px-6 lg:px-10 xl:grid-cols-[minmax(0,1fr)_26rem]">
        <section aria-label="Conversația live" className="flex min-h-0 flex-col rounded-xl bg-white/[0.04] p-4 sm:p-6">
          <div className="mb-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-lg font-bold">
            <span className="inline-flex items-center gap-2">
              <span aria-hidden className="h-1.5 w-8 rounded-full bg-prof-line" />
              Profesor: voce → text
            </span>
            <span className="inline-flex items-center gap-2">
              <span aria-hidden className="h-1.5 w-8 rounded-full bg-elev-line" />
              {lesson.student_name}: semne → voce
            </span>
          </div>
          <MessageList messages={messages.slice(-40)} interim={interim} dark size="xl" className="max-h-[68dvh] flex-1" emptyText="Conversația lecției apare aici." />
          {pending ? (
            <p className="mt-4 flex items-center gap-3 self-end rounded-lg bg-elev px-5 py-3 text-2xl font-bold" role="status">
              <Hand className="size-7" aria-hidden />
              {lesson.student_name} semnează…
            </p>
          ) : null}
        </section>

        <aside className="flex flex-col gap-5">
          <div className="rounded-xl bg-white/[0.06] px-4 py-3">
            <LineMap
              dark
              connection={connection}
              stations={[
                { key: "t", label: "Profesor", line: "prof", on: connected.teacher },
                { key: "s", label: lesson.student_name, line: "elev", on: connected.student },
                { key: "c", label: "Clasa", line: "ink", on: true, here: true },
              ]}
            />
          </div>
          <section aria-label="Semaforul elevului" className="rounded-xl bg-white/[0.06] p-5">
            <h2 className="plate mb-3 text-2xl">{lesson.student_name}</h2>
            <Semafor state={pending ? "semneaza" : semafor} dark size="lg" className="sm:grid-cols-2" />
          </section>
          <GlossaryPanel lesson={lesson} dark large />
        </aside>
      </main>

      {ended && summary ? (
        <div className="flex flex-col gap-5 px-4 pb-10 sm:px-6 lg:px-10">
          <LessonMemory summary={summary} title={lesson.title} dark large />
          <LessonStatsPanel messages={messages} code={lesson.code} dark />
        </div>
      ) : null}
    </div>
  );
}
