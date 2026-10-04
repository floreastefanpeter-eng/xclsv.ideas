"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bell, Eye, Hand, Loader2, Mic, MicOff, QrCode, RefreshCw, Send, Square, Volume2, VolumeX, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { AccountMenu } from "@/components/punte/account-menu";
import { GlossaryPanel } from "@/components/punte/glossary-panel";
import { Insigna } from "@/components/punte/insigna";
import { LessonMemory } from "@/components/punte/lesson-memory";
import { FeedbackForm } from "@/components/punte/feedback-form";
import { LessonStatsPanel } from "@/components/punte/lesson-stats";
import { LessonQr } from "@/components/punte/lesson-qr";
import { LineMap } from "@/components/punte/line-map";
import { MessageList } from "@/components/punte/message-list";
import { RequireAccount } from "@/components/punte/require-account";
import { ErrorScreen, LoadingScreen } from "@/components/punte/screen-state";
import { Panel, StationBand } from "@/components/punte/station-band";
import { useLesson } from "@/hooks/use-lesson";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { acknowledgeAlert, requestSummary, teacherSay } from "@/lib/lesson-actions";
import { alertText } from "@/lib/signs";
import { fallbackSummary } from "@/lib/summary-fallback";
import { speak, speechSynthesisSupported } from "@/lib/speech";
import { ensureSession, errorMessage, getSupabase } from "@/lib/supabase/client";
import { quickLinesFor } from "@/lib/templates";
import type { Profile, SemaforState } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Termenii se extrag automat după atâtea replici noi ale profesorului… */
const TERMS_EVERY_LINES = 3;
/** …dar nu mai des decât atât. */
const TERMS_MIN_GAP_MS = 25_000;

export default function TeacherScreen({ code }: { code: string }) {
  return <RequireAccount role="teacher">{(profile) => <TeacherLesson code={code} profile={profile} />}</RequireAccount>;
}

function TeacherLesson({ code, profile }: { code: string; profile: Profile }) {
  const api = useLesson(code, "teacher", profile.display_name);
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
  const [termsBusy, setTermsBusy] = useState(false);

  const semaforRef = useRef(semafor);
  const voiceOnRef = useRef(voiceOn);
  const spokenIds = useRef(new Set<string>());
  /** Ultimul mesaj-alertă al elevului și momentul în care a ajuns aici (pentru timpul de reacție). */
  const alertMessage = useRef<{ id: string; receivedAt: number } | null>(null);
  const [unknownNotice, setUnknownNotice] = useState<number | null>(null);
  const lastInterimSent = useRef(0);
  const termsState = useRef({ lines: 0, at: 0, running: false });

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
      on("teacher_alert", ({ signId, word }) => {
        setPending(null);
        setAlert({ signId, text: alertText(signId, lesson?.student_name ?? "Elevul", word) });
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
        // Semn făcut, dar nerecunoscut: îl arătăm, nu îl rostim.
        if (m.kind === "system") {
          if (m.meta?.unknown) {
            const id = Date.now();
            setUnknownNotice(id);
            setTimeout(() => setUnknownNotice((n) => (n === id ? null : n)), 4000);
          }
          return;
        }
        if (m.meta?.alert) alertMessage.current = { id: m.id, receivedAt: Date.now() };
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

  // --- Termenii-cheie, extrași automat din vorbirea profesorului --------------
  const extractTerms = useCallback(
    async (manual: boolean) => {
      if (!lesson || termsState.current.running) return;
      termsState.current.running = true;
      setTermsBusy(true);
      try {
        const session = await ensureSession();
        const res = await fetch(`/api/lessons/${lesson.code}/terms`, {
          method: "POST",
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body?.error ?? `Eroare ${res.status}`);
        // Postgres Changes aduce lecția actualizată tuturor ecranelor; aici o aplicăm imediat.
        api.setLesson((prev) => (prev ? { ...prev, terms: body.terms, glossary: body.glossary } : prev));
        if (manual) toast.success(body.glossary.length ? "Termenii lecției au fost actualizați." : "Încă nu am găsit termeni clari. Mai vorbește puțin.");
      } catch (e) {
        if (manual) toast.error(`Nu am putut extrage termenii: ${errorMessage(e)}`);
      } finally {
        termsState.current.running = false;
        termsState.current.at = Date.now();
        setTermsBusy(false);
      }
    },
    [lesson, api],
  );

  const teacherLines = useMemo(() => messages.filter((m) => m.sender_role === "teacher" && m.kind !== "system").length, [messages]);
  useEffect(() => {
    if (ended) return;
    const s = termsState.current;
    if (teacherLines - s.lines < TERMS_EVERY_LINES) return;
    const wait = Math.max(0, s.at + TERMS_MIN_GAP_MS - Date.now());
    const timer = setTimeout(() => {
      termsState.current.lines = teacherLines;
      void extractTerms(false);
    }, wait);
    return () => clearTimeout(timer);
  }, [teacherLines, ended, extractTerms]);

  // --- Microfonul ------------------------------------------------------------
  const say = useCallback(
    async (text: string, kind: "speech" | "typed") => {
      if (!lesson) return;
      setActionError(null);
      try {
        await teacherSay(api, lesson, text, kind);
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
    const source = alertMessage.current;
    alertMessage.current = null;
    setAlert(null);
    void acknowledgeAlert(api, source, alert?.signId).catch(() => undefined);
  }, [api, alert]);

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
      // Serverul nu a răspuns: memoria lecției se face local, din conversația reală.
      const local = {
        lesson_id: lesson.id,
        ...fallbackSummary({
          subject: lesson.subject,
          title: lesson.title,
          terms: lesson.terms,
          studentName: lesson.student_name,
          messages,
        }),
        fallback: true,
      };
      await getSupabase()
        .from("lessons")
        .update({ status: "ended", ended_at: new Date().toISOString() })
        .eq("id", lesson.id);
      api.setSummary(local);
      api.setLesson((prev) => (prev ? { ...prev, status: "ended" } : prev));
      setNotice(`Memoria lecției a fost generată local, pe acest dispozitiv (${errorMessage(e)}).`);
      send("summary_ready", { summary: local });
    } finally {
      setEnding(false);
    }
  }, [lesson, ending, mic, api, send, messages]);

  // --- Contorul lecției ------------------------------------------------------
  const counts = useMemo(() => {
    const NOT_UNDERSTOOD = new Set(["nu_inteles", "repetati", "ajutor", "asl_stuck", "asl_sick", "asl_owie"]);
    const QUESTIONS = new Set(["intrebare", "termen", "asl_why", "asl_who", "asl_where", "asl_wait", "asl_potty"]);
    let notUnderstood = 0;
    let questions = 0;
    let unknown = 0;
    for (const m of messages) {
      if (m.sender_role !== "student") continue;
      if (m.meta?.unknown) unknown++;
      if (NOT_UNDERSTOOD.has(m.meta?.signId ?? "")) notUnderstood++;
      if (QUESTIONS.has(m.meta?.signId ?? "")) questions++;
    }
    return { notUnderstood, questions, unknown };
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
    <>
      <StationBand logoHref="/panou" right={<AccountMenu profile={profile} />}>
        <div className="flex min-w-0 items-center gap-3">
          <p className="min-w-0 truncate">
            <span className="block truncate text-lg font-bold leading-tight">{lesson.title}</span>
            <span className="block truncate text-sm text-muted-foreground">{lesson.subject}</span>
          </p>
          <span className="code-cells hidden rounded-md border border-ink px-2.5 py-1 text-lg sm:inline" aria-label={`Codul lecției ${code.split("").join(" ")}`}>
            {lesson.code}
          </span>
        </div>
      </StationBand>

      <main className="mx-auto grid w-full max-w-7xl flex-1 gap-5 px-4 pb-28 pt-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:pb-10">
        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex items-center gap-3 rounded-md border border-steel/80 bg-white px-3 py-2.5">
            <LineMap
              connection={connection}
              className="flex-1"
              stations={[
                { key: "t", label: "Tu", line: "prof", on: true, here: true },
                { key: "s", label: name, line: "elev", on: connected.student },
                { key: "d", label: "Masa", line: "elev", on: connected.desk },
                { key: "c", label: "Clasa", line: "ink", on: connected.class },
              ]}
            />
            <Button variant="outline" className="shrink-0 lg:hidden" onClick={() => setShowQr((v) => !v)} aria-expanded={showQr}>
              <QrCode aria-hidden />
              <span className="code-cells">{lesson.code}</span>
            </Button>
          </div>

          {showQr ? (
            <div className="rounded-xl border border-border bg-white p-4 lg:hidden">
              <LessonQr code={lesson.code} size={200} />
            </div>
          ) : null}

          <Insigna variant="prof" title={name} subtitle={`${counts.notUnderstood} × nu a înțeles · ${counts.questions} × întrebări`} state={pending ? "semneaza" : semafor} pulse={!!alert || !!pending} alert={!!alert}>
            {alert ? (
              <div className="flex flex-col gap-3 rounded-lg bg-white p-4 text-ink sm:flex-row sm:items-center" role="alert">
                <Bell className="size-8 shrink-0 text-prof" aria-hidden />
                <p className="flex-1 font-display text-2xl font-semibold">{alert.text}</p>
                <Button size="lg" onClick={acknowledge} className="bg-ink hover:bg-ink/85">
                  <Eye aria-hidden />
                  Am văzut
                </Button>
              </div>
            ) : pending ? (
              <p className="flex items-center gap-2 rounded-lg bg-white/15 px-4 py-3 text-xl font-bold" role="status">
                <Hand className="size-6" aria-hidden />
                {name} semnează… <span className="font-normal text-white/85">„{pending}”</span>
              </p>
            ) : unknownNotice ? (
              <p className="flex items-center gap-2 rounded-lg bg-white/15 px-4 py-3 text-xl font-bold" role="status">
                <Hand className="size-6" aria-hidden />
                {name} a făcut un semn necunoscut
              </p>
            ) : null}
          </Insigna>

          {ended ? (
            summary ? (
              <>
                <LessonMemory summary={summary} title={lesson.title} notice={notice} />
                <LessonStatsPanel messages={messages} code={lesson.code} exportable />
                <FeedbackForm lessonId={lesson.id} role="teacher" />
              </>
            ) : (
              <p className="rounded-xl bg-white p-4 text-lg font-bold">Lecția s-a încheiat.</p>
            )
          ) : (
            <Panel id="vorbeste" tone="prof" title={`Vorbește cu ${name}`} icon={<Mic className="size-5" aria-hidden />} bodyClassName="flex flex-col gap-3">
              {mic.status === "unsupported" ? (
                <p className="rounded-md bg-warn-soft px-3 py-2 font-bold text-warn-ink" role="status">
                  Browserul acesta nu are recunoaștere vocală. Folosește Chrome sau Edge, sau scrie mai jos.
                </p>
              ) : (
                <Button
                  size="xl"
                  onClick={() => (micOn ? mic.stop() : mic.start())}
                  className={cn("hidden w-full lg:inline-flex", micOn ? "bg-ink hover:bg-ink/90" : "bg-prof hover:bg-ink")}
                  aria-pressed={micOn}
                >
                  {micOn ? <MicOff aria-hidden /> : <Mic aria-hidden />}
                  {micOn ? "Oprește microfonul" : "Pornește microfonul"}
                </Button>
              )}
              {mic.error ? (
                <p className="rounded-md bg-danger-soft px-3 py-2 font-bold text-danger-ink" role="alert">
                  {mic.error}
                </p>
              ) : null}
              {micOn ? (
                <p className="flex min-h-8 items-center gap-2 text-lg text-muted-foreground" aria-live="polite">
                  <span aria-hidden className="live-dot size-3 shrink-0 rounded-full bg-prof" />
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
                <Input id="typed" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Scrie un mesaj pentru elev…" className="h-12 text-lg" />
                <Button type="submit" disabled={!draft.trim()} aria-label="Trimite mesajul" className="h-12">
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
                <label className="flex min-h-14 items-center justify-between gap-3 rounded-lg border-2 border-border px-4 font-bold">
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
            </Panel>
          )}

          {actionError ? (
            <p className="flex items-start justify-between gap-2 rounded-md bg-danger-soft px-3 py-2 font-bold text-danger-ink" role="alert">
              {actionError}
              <button onClick={() => setActionError(null)} aria-label="Închide mesajul" className="inline-flex size-9 items-center justify-center rounded-md">
                <X className="size-4" aria-hidden />
              </button>
            </p>
          ) : null}

          <Panel id="conversatia" title="Conversația">
            <MessageList messages={messages} interim={interim} emptyText={`Pornește microfonul sau scrie primul mesaj pentru ${name}.`} className="max-h-[70dvh]" />
          </Panel>
        </div>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-24 lg:h-fit">
          <div className="hidden rounded-xl border border-border bg-white p-4 lg:block">
            <LessonQr code={lesson.code} size={180} />
            <p className="mt-2 text-center text-sm text-muted-foreground">Scanează pentru elev, masa elevului sau proiector.</p>
          </div>
          <GlossaryPanel
            lesson={lesson}
            emptyText="Vorbește normal: termenii-cheie apar aici singuri, cu o explicație simplă pentru elev."
            action={
              !ended ? (
                <Button size="sm" variant="ghost" className="text-white hover:bg-white/15 hover:text-white" onClick={() => extractTerms(true)} disabled={termsBusy} aria-label="Actualizează termenii acum">
                  {termsBusy ? <Loader2 className="animate-spin" aria-hidden /> : <RefreshCw aria-hidden />}
                </Button>
              ) : null
            }
          />
          {!ended ? (
            <Button size="lg" variant="outline" className="w-full border-2 border-ink" onClick={endLesson} disabled={ending}>
              {ending ? <Loader2 className="animate-spin" aria-hidden /> : <Square aria-hidden />}
              {ending ? "Se generează memoria lecției…" : "Încheie lecția"}
            </Button>
          ) : null}
        </aside>
      </main>

      {/* Pe telefon: microfonul stă jos, la îndemâna degetului mare. */}
      {!ended && mic.status !== "unsupported" ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-white/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
          <Button
            size="xl"
            onClick={() => (micOn ? mic.stop() : mic.start())}
            className={cn("w-full", micOn ? "bg-ink hover:bg-ink/90" : "bg-prof hover:bg-ink")}
            aria-pressed={micOn}
          >
            {micOn ? <MicOff aria-hidden /> : <Mic aria-hidden />}
            {micOn ? "Oprește microfonul" : "Pornește microfonul"}
          </Button>
        </div>
      ) : null}
    </>
  );
}
