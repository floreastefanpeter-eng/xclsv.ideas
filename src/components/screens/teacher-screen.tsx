"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  Eye,
  Hand,
  Loader2,
  Mic,
  MicOff,
  Play,
  QrCode,
  Send,
  Square,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ConnectionStatus } from "@/components/punte/connection-status";
import { Insigna } from "@/components/punte/insigna";
import { LessonMemory } from "@/components/punte/lesson-memory";
import { LessonQr } from "@/components/punte/lesson-qr";
import { Logo } from "@/components/punte/logo";
import { MessageList } from "@/components/punte/message-list";
import { ErrorScreen, LoadingScreen } from "@/components/punte/screen-state";
import { useLesson } from "@/hooks/use-lesson";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { commitSign, requestSummary, teacherSay } from "@/lib/lesson-actions";
import { alertText, getSign, SEMAFOR_META } from "@/lib/signs";
import { speak, speechSynthesisSupported } from "@/lib/speech";
import { ensureSession, errorMessage } from "@/lib/supabase/client";
import { demoLinesFor, quickLinesFor } from "@/lib/templates";
import type { SemaforState } from "@/lib/types";
import { cn } from "@/lib/utils";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function TeacherScreen({ code }: { code: string }) {
  const api = useLesson(code, "teacher");
  const { lesson, messages, summary, on, onMessage, onPresenceJoin, send, connection, connected } = api;

  const [semafor, setSemafor] = useState<SemaforState>("neutru");
  const [alert, setAlert] = useState<{ text: string; signId: string } | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [interim, setInterim] = useState("");
  const [draft, setDraft] = useState("");
  const [voiceOn, setVoiceOn] = useState(true);
  const [showQr, setShowQr] = useState(false);
  const [ending, setEnding] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [demoStep, setDemoStep] = useState<string | null>(null);

  const semaforRef = useRef(semafor);
  const voiceOnRef = useRef(voiceOn);
  const spokenIds = useRef(new Set<string>());
  const demoRunning = useRef(false);
  const lastInterimSent = useRef(0);

  useEffect(() => {
    semaforRef.current = semafor;
  }, [semafor]);
  useEffect(() => {
    voiceOnRef.current = voiceOn;
  }, [voiceOn]);

  const ended = lesson?.status === "ended" || !!summary;

  // --- Evenimente în timp real ---------------------------------------------
  useEffect(() => {
    const offs = [
      on("semafor", ({ state }) => setSemafor(state)),
      on("pending_sign", ({ text }) => setPending(text)),
      on("pending_cancel", () => setPending(null)),
      on("teacher_alert", ({ signId }) => {
        setPending(null);
        setAlert({ signId, text: alertText(signId, lesson?.student_name ?? "Elevul") });
        try {
          navigator.vibrate?.([300, 120, 300]);
        } catch {
          // vibrația nu e disponibilă (iOS)
        }
      }),
      on("teacher_alert_ack", () => setAlert(null)),
    ];
    return () => offs.forEach((off) => off());
  }, [on, lesson?.student_name]);

  // Fraza elevului se rostește pe dispozitivul profesorului.
  useEffect(
    () =>
      onMessage((m) => {
        if (m.sender_role !== "student" || spokenIds.current.has(m.id)) return;
        spokenIds.current.add(m.id);
        setPending(null);
        if (voiceOnRef.current) {
          speak(m.text, { voiceName: m.meta?.voice?.name, style: m.meta?.voice?.style, prosody: m.meta?.prosody });
        }
      }),
    [onMessage],
  );

  // Starea semaforului e corectă și pentru cine intră mai târziu.
  useEffect(
    () =>
      onPresenceJoin(() => {
        send("semafor", { state: semaforRef.current });
      }),
    [onPresenceJoin, send],
  );

  // --- Microfonul ------------------------------------------------------------
  const say = useCallback(
    async (text: string, kind: "speech" | "typed", demo = false) => {
      if (!lesson) return;
      setActionError(null);
      try {
        await teacherSay(api, lesson, text, kind, demo ? { demo: true } : {});
      } catch (e) {
        setActionError(`Mesajul nu a fost trimis: ${errorMessage(e)}`);
      }
    },
    [api, lesson],
  );

  const mic = useSpeechRecognition({
    onInterim: (text) => {
      setInterim(text);
      const now = performance.now();
      if (!text || now - lastInterimSent.current > 180) {
        lastInterimSent.current = now;
        send("caption_interim", { text });
      }
    },
    onFinal: (text) => {
      setInterim("");
      send("caption_interim", { text: "" });
      void say(text, "speech");
    },
  });

  // --- Acțiuni ---------------------------------------------------------------
  const acknowledge = useCallback(() => {
    send("teacher_alert_ack", { signId: alert?.signId });
    setAlert(null);
  }, [send, alert]);

  const endLesson = useCallback(async () => {
    if (!lesson || ending) return;
    setEnding(true);
    setActionError(null);
    mic.stop();
    try {
      const session = await ensureSession();
      const res = await requestSummary(lesson.code, session.access_token);
      api.setSummary(res.summary);
      api.setLesson((prev) => (prev ? { ...prev, status: "ended" } : prev));
      setNotice(res.notice);
      send("summary_ready", { summary: res.summary });
    } catch (e) {
      setActionError(`Nu am putut încheia lecția: ${errorMessage(e)}`);
    } finally {
      setEnding(false);
    }
  }, [lesson, ending, mic, api, send]);

  // --- Modul demo (tasta D) --------------------------------------------------
  const typeInterim = useCallback(
    async (text: string) => {
      const words = text.split(" ");
      for (let i = 1; i <= words.length && demoRunning.current; i += 2) {
        const partial = words.slice(0, i).join(" ");
        setInterim(partial);
        send("caption_interim", { text: partial });
        await sleep(180);
      }
      setInterim("");
      send("caption_interim", { text: "" });
    },
    [send],
  );

  const demoSign = useCallback(
    async (signId: string) => {
      const sign = getSign(signId);
      if (!sign || !lesson) return;
      const preview = sign.id === "termen" ? "Ce este…" : sign.phrase;
      send("pending_sign", { signId, text: preview });
      send("semafor", { state: "semneaza" });
      await sleep(1500);
      if (!demoRunning.current) return;
      await commitSign(api, lesson, sign, { confidence: 0.93, demo: true, prosody: { rate: 1, pitch: 1 } });
    },
    [api, lesson, send],
  );

  const runDemo = useCallback(async () => {
    if (!lesson || demoRunning.current || ended) return;
    demoRunning.current = true;
    const lines = demoLinesFor(lesson.subject, lesson.title, lesson.terms, lesson.student_name);
    const step = async (label: string, fn: () => Promise<void>, wait: number) => {
      if (!demoRunning.current) return;
      setDemoStep(label);
      await fn();
      if (demoRunning.current) await sleep(wait);
    };
    try {
      send("semafor", { state: "neutru" });
      await step("1/8 · Profesorul îl strigă pe elev", async () => {
        await typeInterim(lines.call);
        await say(lines.call, "speech", true);
      }, 3500);
      await step("2/8 · Elevul semnează „Nu am înțeles”", () => demoSign("nu_inteles"), 3500);
      await step("3/8 · Profesorul repetă explicația", async () => {
        send("teacher_alert_ack", { signId: "nu_inteles" });
        await typeInterim(lines.repeat);
        await say(lines.repeat, "speech", true);
      }, 3500);
      await step("4/8 · Elevul întreabă despre termen", () => demoSign("termen"), 3500);
      await step("5/8 · Profesorul explică termenul", async () => {
        send("teacher_alert_ack", { signId: "termen" });
        await typeInterim(lines.termAnswer);
        await say(lines.termAnswer, "speech", true);
      }, 4000);
      await step("6/8 · Elevul semnează „Am terminat”", () => demoSign("terminat"), 3000);
      await step("7/8 · Profesorul anunță tema", async () => {
        await typeInterim(lines.homework);
        await say(lines.homework, "speech", true);
      }, 3500);
      await step("8/8 · Lecția se încheie", () => endLesson(), 0);
    } finally {
      demoRunning.current = false;
      setDemoStep(null);
    }
  }, [lesson, ended, send, typeInterim, say, demoSign, endLesson]);

  const stopDemo = useCallback(() => {
    demoRunning.current = false;
    setDemoStep(null);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("input, textarea, select, [contenteditable]")) return;
      if (e.key === "d" || e.key === "D") {
        if (demoRunning.current) stopDemo();
        else void runDemo();
      }
      if (e.key === "Escape" && demoRunning.current) stopDemo();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [runDemo, stopDemo]);

  // --- Contorul lecției ------------------------------------------------------
  const counts = useMemo(() => {
    let notUnderstood = 0;
    let questions = 0;
    for (const m of messages) {
      if (m.sender_role !== "student") continue;
      if (m.meta?.signId === "nu_inteles" || m.meta?.signId === "repetati") notUnderstood++;
      if (m.meta?.signId === "intrebare" || m.meta?.signId === "termen") questions++;
    }
    return { notUnderstood, questions };
  }, [messages]);

  const quickLines = useMemo(
    () => (lesson ? quickLinesFor(lesson.subject, lesson.title, lesson.terms, lesson.student_name) : []),
    [lesson],
  );

  if (api.error) return <ErrorScreen message={api.error} />;
  if (!lesson) return <LoadingScreen />;

  const name = lesson.student_name;
  const micOn = mic.status === "listening" || mic.status === "starting";

  return (
    <main className="mx-auto grid w-full max-w-6xl flex-1 gap-5 px-4 pb-10 pt-4 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="flex min-w-0 flex-col gap-4">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <Logo />
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-white px-3 py-2 font-mono text-lg font-black tracking-widest" aria-label={`Codul lecției ${code.split("").join(" ")}`}>
              {lesson.code}
            </span>
            <Button variant="outline" className="bg-white lg:hidden" onClick={() => setShowQr((v) => !v)} aria-expanded={showQr}>
              <QrCode aria-hidden />
              QR
            </Button>
          </div>
        </header>

        <ConnectionStatus connection={connection} connected={connected} show={["student", "class"]} />

        {showQr ? (
          <div className="rounded-3xl bg-white p-4 lg:hidden">
            <LessonQr code={lesson.code} size={200} />
          </div>
        ) : null}

        {demoStep ? (
          <div className="flex items-center justify-between gap-3 rounded-2xl bg-ink px-4 py-3 text-white" role="status">
            <span className="flex items-center gap-2 font-bold">
              <Play className="size-5" aria-hidden />
              Mod demo · {demoStep}
            </span>
            <Button variant="secondary" size="sm" onClick={stopDemo}>
              <Square aria-hidden />
              Oprește
            </Button>
          </div>
        ) : null}

        <Insigna
          variant="prof"
          subtitle={`${lesson.subject} · ${lesson.title}`}
          title={`Insigna profesorului`}
          state={pending ? "semneaza" : semafor}
          pulse={!!alert || !!pending}
          alert={!!alert}
        >
          {alert ? (
            <div className="flex flex-col gap-3 rounded-2xl bg-white p-4 text-ink sm:flex-row sm:items-center" role="alert">
              <Bell className="size-8 shrink-0 text-sem-neinteles" aria-hidden />
              <p className="flex-1 font-display text-2xl font-extrabold">{alert.text}</p>
              <Button size="lg" onClick={acknowledge} className="bg-ink hover:bg-ink/85">
                <Eye aria-hidden />
                Am văzut
              </Button>
            </div>
          ) : pending ? (
            <p className="flex items-center gap-2 rounded-2xl bg-white/15 px-4 py-3 text-xl font-bold" role="status">
              <Hand className="size-6" aria-hidden />
              {name} semnează… <span className="font-normal text-white/80">„{pending}”</span>
            </p>
          ) : null}
          <p className="mt-3 text-lg font-bold text-white/90" aria-live="polite">
            {counts.notUnderstood} × nu a înțeles · {counts.questions} × întrebări
          </p>
        </Insigna>

        {ended ? (
          summary ? (
            <LessonMemory summary={summary} title={lesson.title} notice={notice} />
          ) : (
            <p className="rounded-2xl bg-white p-4 text-lg font-bold">Lecția s-a încheiat.</p>
          )
        ) : (
          <section aria-label="Vorbește cu elevul" className="flex flex-col gap-3 rounded-3xl bg-white p-4 shadow-sm">
            {mic.status === "unsupported" ? (
              <p className="rounded-xl bg-[#FEF3C7] px-3 py-2 font-bold text-[#78350F]" role="status">
                Browserul acesta nu are recunoaștere vocală. Folosește Chrome sau Edge, sau scrie mai jos.
              </p>
            ) : (
              <Button
                size="xl"
                onClick={() => (micOn ? mic.stop() : mic.start())}
                className={cn("w-full", micOn ? "bg-sem-neinteles hover:bg-sem-neinteles/90" : "bg-prof hover:bg-prof-dark")}
                aria-pressed={micOn}
              >
                {micOn ? <MicOff aria-hidden /> : <Mic aria-hidden />}
                {micOn ? "Oprește microfonul" : "Pornește microfonul"}
              </Button>
            )}
            {mic.error ? (
              <p className="rounded-xl bg-[#FEE2E2] px-3 py-2 font-bold text-[#991B1B]" role="alert">
                {mic.error}
              </p>
            ) : null}
            {micOn ? (
              <p className="min-h-8 text-lg text-muted-foreground" aria-live="polite">
                {interim ? `„${interim}…”` : "Ascult… vorbește normal, fraza apare la elev."}
              </p>
            ) : null}

            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (!draft.trim()) return;
                void say(draft, "typed");
                setDraft("");
              }}
            >
              <label htmlFor="typed" className="sr-only">
                Scrie un mesaj pentru elev
              </label>
              <Input
                id="typed"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Scrie un mesaj pentru elev…"
                className="text-lg"
              />
              <Button type="submit" disabled={!draft.trim()} aria-label="Trimite mesajul">
                <Send aria-hidden />
                <span className="hidden sm:inline">Trimite</span>
              </Button>
            </form>

            <div>
              <h2 className="mb-2 font-bold">Replici rapide</h2>
              <div className="flex flex-wrap gap-2">
                {quickLines.map((line) => (
                  <Button key={line} variant="secondary" className="h-auto min-h-11 whitespace-normal py-2 text-left" onClick={() => say(line, "typed")}>
                    {line}
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <Button size="lg" variant="outline" className="border-2 border-elev text-elev" onClick={() => send("buzz", { kind: "atentie", text: `Atenție, ${name}!` })}>
                <Bell aria-hidden />
                Atenție, {name}
              </Button>
              <label className="flex min-h-14 items-center justify-between gap-3 rounded-xl border-2 border-border px-4 font-bold">
                <span className="flex items-center gap-2">
                  {voiceOn ? <Volume2 className="size-5" aria-hidden /> : <VolumeX className="size-5" aria-hidden />}
                  Rostește fraza elevului
                </span>
                <Switch checked={voiceOn} onCheckedChange={setVoiceOn} aria-label="Rostește fraza elevului" />
              </label>
            </div>
            {!speechSynthesisSupported() ? (
              <p className="text-sm text-muted-foreground">Browserul nu poate rosti text; frazele elevului apar doar scrise.</p>
            ) : null}
          </section>
        )}

        {actionError ? (
          <p className="flex items-start justify-between gap-2 rounded-xl bg-[#FEE2E2] px-3 py-2 font-bold text-[#991B1B]" role="alert">
            {actionError}
            <button onClick={() => setActionError(null)} aria-label="Închide mesajul" className="inline-flex size-9 items-center justify-center rounded-full">
              <X className="size-4" aria-hidden />
            </button>
          </p>
        ) : null}

        <section aria-label="Conversația" className="rounded-3xl bg-white/60 p-4">
          <h2 className="mb-3 font-display text-xl font-extrabold">Conversația</h2>
          <MessageList messages={messages} interim={interim} emptyText={`Pornește microfonul sau scrie primul mesaj pentru ${name}.`} />
        </section>
      </div>

      <aside className="flex flex-col gap-4 lg:sticky lg:top-4 lg:h-fit">
        <div className="hidden rounded-3xl bg-white p-4 shadow-sm lg:block">
          <LessonQr code={lesson.code} size={200} />
        </div>
        <div className="rounded-3xl bg-white p-4 shadow-sm">
          <h2 className="mb-2 font-bold">Termenii lecției</h2>
          <ul className="flex flex-wrap gap-2">
            {lesson.terms.map((t) => (
              <li key={t} className="rounded-full bg-elev-soft px-3 py-1 font-bold text-elev">
                {t}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm text-muted-foreground">
            Starea elevului: <strong>{SEMAFOR_META[semafor].label}</strong>
          </p>
        </div>
        {!ended ? (
          <Button size="lg" variant="destructive" className="w-full border-2 border-sem-neinteles" onClick={endLesson} disabled={ending}>
            {ending ? <Loader2 className="animate-spin" aria-hidden /> : <Square aria-hidden />}
            {ending ? "Se generează memoria lecției…" : "Încheie lecția"}
          </Button>
        ) : null}
        {!ended ? (
          <Button variant="outline" className="w-full bg-white" onClick={() => (demoStep ? stopDemo() : runDemo())}>
            <Play aria-hidden />
            {demoStep ? "Oprește modul demo" : "Mod demo (tasta D)"}
          </Button>
        ) : null}
      </aside>
    </main>
  );
}
