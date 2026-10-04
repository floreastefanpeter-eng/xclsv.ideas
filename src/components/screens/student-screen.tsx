"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Check, Eye, GraduationCap, Hand, Volume2, X } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { BuzzBanner, vibrate } from "@/components/punte/buzz-banner";
import { CameraView } from "@/components/punte/camera-view";
import { ConnectionStatus } from "@/components/punte/connection-status";
import { Insigna } from "@/components/punte/insigna";
import { LessonMemory } from "@/components/punte/lesson-memory";
import { Logo } from "@/components/punte/logo";
import { MessageList } from "@/components/punte/message-list";
import { ErrorScreen, LoadingScreen } from "@/components/punte/screen-state";
import { useHandTracker } from "@/hooks/use-hand-tracker";
import { useLesson } from "@/hooks/use-lesson";
import { useSignProfile } from "@/hooks/use-sign-profile";
import { useVoiceChoice } from "@/hooks/use-voice-choice";
import { classify, extractFeatures, MotionMeter, StabilityGate, trainedSignCount, type HandFrame } from "@/lib/knn";
import { commitSign } from "@/lib/lesson-actions";
import { getSign, phraseFor, SIGNS, signByKey, type SignDef } from "@/lib/signs";
import { speak, VOICE_STYLES } from "@/lib/speech";
import { errorMessage } from "@/lib/supabase/client";
import type { BuzzKind, SemaforState, VoiceStyle } from "@/lib/types";
import { cn } from "@/lib/utils";

const CONFIRM_MS = 1500;

interface Pending {
  sign: SignDef;
  text: string;
  confidence: number;
  manual: boolean;
  prosody: { rate: number; pitch: number };
}

export default function StudentScreen({ code }: { code: string }) {
  const api = useLesson(code, "student");
  const { lesson, messages, summary, on, onMessage, send, connection, connected } = api;
  const { samples } = useSignProfile();
  const voice = useVoiceChoice();

  const [semafor, setSemafor] = useState<SemaforState>("neutru");
  const [interim, setInterim] = useState("");
  const [buzz, setBuzz] = useState<{ kind: BuzzKind; text?: string; id: number } | null>(null);
  const [seen, setSeen] = useState(false);
  const [pending, setPending] = useState<Pending | null>(null);
  const [detected, setDetected] = useState<{ label: string | null; confidence: number; stability: number }>({
    label: null,
    confidence: 0,
    stability: 0,
  });
  const [sendError, setSendError] = useState<string | null>(null);

  const gate = useRef(new StabilityGate());
  const motion = useRef(new MotionMeter());
  const pendingRef = useRef<Pending | null>(null);
  const confirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevSemafor = useRef<SemaforState>("neutru");
  const frameCount = useRef(0);
  const samplesRef = useRef(samples);

  useEffect(() => {
    samplesRef.current = samples;
  }, [samples]);

  const ended = lesson?.status === "ended" || !!summary;

  // --- Evenimente în timp real ---------------------------------------------
  useEffect(() => {
    let buzzTimer: ReturnType<typeof setTimeout> | undefined;
    let seenTimer: ReturnType<typeof setTimeout> | undefined;
    const offs = [
      on("semafor", ({ state }) => setSemafor(state)),
      on("caption_interim", ({ text }) => setInterim(text)),
      on("buzz", ({ kind, text }) => {
        vibrate(kind);
        setBuzz({ kind, text, id: Date.now() });
        clearTimeout(buzzTimer);
        buzzTimer = setTimeout(() => setBuzz(null), 4500);
      }),
      on("teacher_alert_ack", () => {
        setSeen(true);
        clearTimeout(seenTimer);
        seenTimer = setTimeout(() => setSeen(false), 4000);
      }),
    ];
    return () => {
      offs.forEach((off) => off());
      clearTimeout(buzzTimer);
      clearTimeout(seenTimer);
    };
  }, [on]);

  // Fraza finală înlocuiește textul interimar.
  useEffect(
    () =>
      onMessage((m) => {
        if (m.sender_role === "teacher") setInterim("");
      }),
    [onMessage],
  );

  // --- Confirmarea de 1,5 s cu anulare ---------------------------------------
  const confirm = useCallback(async () => {
    const p = pendingRef.current;
    pendingRef.current = null;
    setPending(null);
    if (!p || !lesson) return;
    try {
      await commitSign(api, lesson, p.sign, {
        confidence: Math.round(p.confidence * 100) / 100,
        manual: p.manual || undefined,
        prosody: p.prosody,
        voice: { name: voice.voiceName, style: voice.style },
      });
      setSendError(null);
    } catch (e) {
      setSendError(`Semnul nu a fost trimis: ${errorMessage(e)}`);
      send("semafor", { state: prevSemafor.current });
    }
    gate.current.cooldown();
  }, [api, lesson, send, voice.voiceName, voice.style]);

  const startPending = useCallback(
    (sign: SignDef, confidence: number, manual: boolean) => {
      if (pendingRef.current || !lesson || ended) return;
      const { text } = phraseFor(sign, lesson.terms);
      const p: Pending = { sign, text, confidence, manual, prosody: manual ? { rate: 1, pitch: 1 } : motion.current.prosody() };
      pendingRef.current = p;
      setPending(p);
      prevSemafor.current = semafor;
      send("pending_sign", { signId: sign.id, text });
      send("semafor", { state: "semneaza" });
      confirmTimer.current = setTimeout(confirm, CONFIRM_MS);
    },
    [lesson, ended, semafor, send, confirm],
  );

  const cancelPending = useCallback(() => {
    if (!pendingRef.current) return;
    if (confirmTimer.current) clearTimeout(confirmTimer.current);
    pendingRef.current = null;
    setPending(null);
    send("pending_cancel", {});
    send("semafor", { state: prevSemafor.current });
    gate.current.cooldown();
  }, [send]);

  useEffect(() => () => {
    if (confirmTimer.current) clearTimeout(confirmTimer.current);
  }, []);

  // --- Recunoașterea semnelor ------------------------------------------------
  const onFrame = useCallback(
    (frame: HandFrame) => {
      motion.current.push(frame);
      const features = extractFeatures(frame);
      const pred = features ? classify(features, samplesRef.current) : null;
      const stable = pendingRef.current ? null : gate.current.push(pred);
      if (++frameCount.current % 3 === 0 || stable) {
        const def = pred ? getSign(pred.label) : undefined;
        setDetected({
          label: pred ? (def?.label ?? "Fără semn") : null,
          confidence: pred?.confidence ?? 0,
          stability: gate.current.progress,
        });
      }
      if (stable) {
        const sign = getSign(stable);
        if (sign) startPending(sign, pred?.confidence ?? 0, false);
      }
    },
    [startPending],
  );

  const tracker = useHandTracker(onFrame);

  // Tastele 1–6 (plasa de siguranță) și Esc pentru anulare.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input, textarea, select")) return;
      if (e.key === "Escape") return cancelPending();
      const sign = signByKey(e.key);
      if (sign) startPending(sign, 1, true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [startPending, cancelPending]);

  const trained = useMemo(() => trainedSignCount(samples), [samples]);
  const captions = useMemo(() => messages.slice(-30), [messages]);

  if (api.error) return <ErrorScreen message={api.error} />;
  if (!lesson) return <LoadingScreen />;

  return (
    <main className="mx-auto grid w-full max-w-6xl flex-1 gap-4 px-4 pb-10 pt-4 lg:grid-cols-[minmax(0,1fr)_420px]">
      <BuzzBanner buzz={buzz} />

      <div className="flex min-w-0 flex-col gap-4">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <Logo />
          <ConnectionStatus connection={connection} connected={connected} show={["teacher"]} />
        </header>

        <Insigna
          variant="elev"
          subtitle={`Insigna elevului · ${lesson.subject}`}
          title={lesson.student_name}
          state={pending ? "semneaza" : semafor}
          pulse={!!pending || semafor === "neinteles"}
        >
          {seen ? (
            <p className="flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-xl font-bold text-ink" role="status">
              <Eye className="size-6 text-sem-inteles" aria-hidden />
              Profesorul a văzut
            </p>
          ) : null}
        </Insigna>

        {ended && summary ? <LessonMemory summary={summary} title={lesson.title} /> : null}

        <section aria-labelledby="subtitrari" className="flex min-h-[40dvh] flex-col rounded-3xl bg-white p-4 shadow-sm">
          <h2 id="subtitrari" className="mb-3 font-display text-xl font-extrabold">
            Subtitrări · {lesson.title}
          </h2>
          <MessageList
            messages={captions}
            interim={interim}
            size="lg"
            className="max-h-[60dvh] flex-1"
            emptyText="Când profesorul vorbește, textul apare aici."
          />
        </section>
      </div>

      <div className="flex flex-col gap-4">
        <CameraView
          videoRef={tracker.videoRef}
          canvasRef={tracker.canvasRef}
          status={tracker.status}
          error={tracker.error}
          handsVisible={tracker.handsVisible}
          label={detected.label}
          confidence={detected.confidence}
          stability={detected.stability}
          onStart={tracker.start}
          onStop={tracker.stop}
          overlay={
            pending ? (
              <div className="absolute inset-0 flex flex-col justify-end bg-elev/85 p-4" role="alertdialog" aria-label="Confirmă semnul">
                <p className="text-sm font-bold uppercase tracking-wider text-white/80">Se trimite…</p>
                <p className="font-display text-3xl font-extrabold">{pending.text}</p>
                <div className="my-3 h-3 overflow-hidden rounded-full bg-white/25">
                  <div key={pending.text + pending.sign.id} className="confirm-bar h-full bg-white" style={{ ["--confirm-ms" as string]: `${CONFIRM_MS}ms` }} />
                </div>
                <Button size="xl" onClick={cancelPending} className="w-full bg-white text-ink hover:bg-white/90">
                  <X aria-hidden />
                  Anulează (Esc)
                </Button>
              </div>
            ) : null
          }
        />

        {trained === 0 ? (
          <p className="rounded-2xl bg-[#FEF3C7] px-4 py-3 font-bold text-[#78350F]">
            Nu ai semne antrenate pe acest dispozitiv. Antrenează-le sau folosește butoanele de mai jos.
          </p>
        ) : null}

        {sendError ? (
          <p className="rounded-2xl bg-[#FEE2E2] px-4 py-3 font-bold text-[#991B1B]" role="alert">
            {sendError}
          </p>
        ) : null}

        {pending && tracker.status !== "ready" ? (
          <div className="rounded-3xl bg-elev p-4 text-white" role="alertdialog" aria-label="Confirmă semnul">
            <p className="font-display text-2xl font-extrabold">{pending.text}</p>
            <div className="my-3 h-3 overflow-hidden rounded-full bg-white/25">
              <div key={pending.text} className="confirm-bar h-full bg-white" style={{ ["--confirm-ms" as string]: `${CONFIRM_MS}ms` }} />
            </div>
            <Button size="lg" onClick={cancelPending} className="w-full bg-white text-ink hover:bg-white/90">
              <X aria-hidden />
              Anulează (Esc)
            </Button>
          </div>
        ) : null}

        <section aria-labelledby="simuleaza" className="rounded-3xl bg-white p-4 shadow-sm">
          <h2 id="simuleaza" className="mb-1 flex items-center gap-2 font-display text-xl font-extrabold">
            <Hand className="size-5" aria-hidden />
            Simulează un semn
          </h2>
          <p className="mb-3 text-sm text-muted-foreground">Sau apasă tastele 1–6.</p>
          <div className="grid grid-cols-2 gap-2">
            {SIGNS.map((s) => (
              <Button
                key={s.id}
                variant="outline"
                className="h-auto min-h-14 justify-start whitespace-normal border-2 py-2 text-left"
                onClick={() => startPending(s, 1, true)}
                disabled={!!pending || ended}
              >
                <kbd className="rounded-md bg-ink px-2 py-0.5 font-mono text-sm text-white">{s.key}</kbd>
                <span className="font-bold">{s.label}</span>
              </Button>
            ))}
          </div>
        </section>

        <VoicePicker {...voice} terms={lesson.terms} />

        <Link href="/elev/antrenare" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "bg-white")}>
          <GraduationCap aria-hidden />
          Antrenează semnele ({trained}/6)
        </Link>
      </div>
    </main>
  );
}

function VoicePicker({
  voices,
  loaded,
  voiceName,
  setVoiceName,
  style,
  setStyle,
  terms,
}: ReturnType<typeof useVoiceChoice> & { terms: string[] }) {
  const sample = phraseFor(SIGNS[3], terms).text;
  return (
    <section aria-labelledby="vocea" className="rounded-3xl bg-white p-4 shadow-sm">
      <h2 id="vocea" className="mb-3 flex items-center gap-2 font-display text-xl font-extrabold">
        <Volume2 className="size-5" aria-hidden />
        Vocea mea
      </h2>
      {loaded && voices.length === 0 ? (
        <p className="mb-3 rounded-xl bg-[#FEF3C7] px-3 py-2 text-sm font-bold text-[#78350F]">
          Nu există o voce românească pe acest dispozitiv. Se va folosi vocea implicită a profesorului.
        </p>
      ) : null}
      {voices.length > 0 ? (
        <>
          <label htmlFor="voice" className="mb-1 block font-bold">
            Voce
          </label>
          <select
            id="voice"
            value={voiceName ?? ""}
            onChange={(e) => setVoiceName(e.target.value || null)}
            className="mb-3 h-11 w-full rounded-lg border border-input bg-white px-3 text-base"
          >
            <option value="">Implicită (ro-RO)</option>
            {voices.map((v) => (
              <option key={v.name} value={v.name}>
                {v.name}
              </option>
            ))}
          </select>
        </>
      ) : null}
      <fieldset>
        <legend className="mb-1 font-bold">Stil</legend>
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(VOICE_STYLES) as VoiceStyle[]).map((s) => (
            <Button
              key={s}
              variant={style === s ? "default" : "outline"}
              onClick={() => setStyle(s)}
              aria-pressed={style === s}
            >
              {style === s ? <Check aria-hidden /> : null}
              {VOICE_STYLES[s].label}
            </Button>
          ))}
        </div>
      </fieldset>
      <Button variant="secondary" className="mt-3 w-full" onClick={() => speak(sample, { voiceName, style })}>
        <Volume2 aria-hidden />
        Ascultă: „{sample}”
      </Button>
    </section>
  );
}
