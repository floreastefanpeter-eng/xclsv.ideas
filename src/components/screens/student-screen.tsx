"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Check, CircleHelp, Cpu, Eye, GraduationCap, Hand, ScanFace, Volume2, X } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { BuzzBanner, vibrate } from "@/components/punte/buzz-banner";
import { CameraView } from "@/components/punte/camera-view";
import { AccountMenu } from "@/components/punte/account-menu";
import { GlossaryPanel } from "@/components/punte/glossary-panel";
import { LanguageSelect } from "@/components/punte/language-select";
import { LineMap } from "@/components/punte/line-map";
import { RequireAccount } from "@/components/punte/require-account";
import { Panel, StationBand } from "@/components/punte/station-band";
import { Insigna } from "@/components/punte/insigna";
import { LessonMemory } from "@/components/punte/lesson-memory";
import { MessageList } from "@/components/punte/message-list";
import { ErrorScreen, LoadingScreen } from "@/components/punte/screen-state";
import { FeedbackForm } from "@/components/punte/feedback-form";
import { LessonStatsPanel } from "@/components/punte/lesson-stats";
import { SignGuide } from "@/components/punte/sign-guide";
import { useHandTracker, type VisionFrame } from "@/hooks/use-hand-tracker";
import { useFacePrivacy, useRegistration } from "@/hooks/use-face-privacy";
import { classifyMoving, sequenceFeatures } from "@/lib/moving-signs";
import { useLesson } from "@/hooks/use-lesson";
import { useTranslations } from "@/hooks/use-translations";
import { useSignProfile } from "@/hooks/use-sign-profile";
import { useVoiceChoice } from "@/hooks/use-voice-choice";
import { classify, extractFeatures, MIN_MATCH_SCORE, MotionMeter, StabilityGate, trainedWords } from "@/lib/knn";
import { loadAslClassifier, type AslClassifier } from "@/lib/asl/classifier";
import { ASL_RO, aslToSign } from "@/lib/asl/glossary";
import { SignSegmenter, toWindow } from "@/lib/asl/preprocess";
import { commitSign, reportUnknown } from "@/lib/lesson-actions";
import {
  BASE_DICTIONARY,
  CATEGORY_LABELS,
  findSign,
  NONE_SIGN,
  phraseFor,
  signByKey,
  type SignCategory,
  type SignDef,
} from "@/lib/signs";
import { speak, VOICE_STYLES } from "@/lib/speech";
import { errorMessage } from "@/lib/supabase/client";
import type { BuzzKind, MessageMeta, Profile, SemaforState, VoiceStyle } from "@/lib/types";
import { cn } from "@/lib/utils";

const CONFIRM_MS = 1500;
/** Sub această probabilitate, semnul ASL e „necunoscut”. */
const ASL_MIN_PROB = 0.5;
/** Câte cadre cu mâna nemișcată, fără potrivire în dicționar, până la „semn necunoscut”. */
const UNKNOWN_STREAK = 25;
const UNKNOWN_COOLDOWN_MS = 4000;
const ENGINE_KEY = "punte-engine";

type Engine = "asl" | "dictionar";

function readEngine(): Engine {
  try {
    return localStorage.getItem(ENGINE_KEY) === "dictionar" ? "dictionar" : "asl";
  } catch {
    return "asl";
  }
}

interface Pending {
  sign: SignDef;
  text: string;
  confidence: number;
  manual: boolean;
  prosody: { rate: number; pitch: number };
  extra?: Pick<MessageMeta, "engine" | "asl" | "top">;
}

export default function StudentScreen({ code }: { code: string }) {
  return (
    <RequireAccount role="student">
      {(profile, updateProfile) => <StudentLesson code={code} profile={profile} updateProfile={updateProfile} />}
    </RequireAccount>
  );
}

function StudentLesson({
  code,
  profile,
  updateProfile,
}: {
  code: string;
  profile: Profile;
  updateProfile: (p: Partial<Profile>) => Promise<void>;
}) {
  const api = useLesson(code, "student", profile.display_name);
  const { lesson, messages, summary, on, onMessage, send, connection, connected } = api;
  const { samples, moving, dictionary } = useSignProfile();
  const registration = useRegistration();
  const [gateDismissed, setGateDismissed] = useState(false);
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
  const [engine, setEngine] = useState<Engine>(readEngine);
  const [aslStatus, setAslStatus] = useState<"loading" | "ready" | "error">("loading");
  const [unknownFlash, setUnknownFlash] = useState<{ id: number; top?: [string, number][] } | null>(null);

  const gate = useRef(new StabilityGate());
  const motion = useRef(new MotionMeter());
  const pendingRef = useRef<Pending | null>(null);
  const confirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevSemafor = useRef<SemaforState>("neutru");
  const frameCount = useRef(0);
  const samplesRef = useRef(samples);
  const dictRef = useRef(dictionary);
  const allowedRef = useRef(new Set(dictionary.map((s) => s.id)));
  const engineRef = useRef<Engine>(engine);
  const segmenter = useRef(new SignSegmenter());
  const aslRef = useRef<AslClassifier | null>(null);
  const unknownStreak = useRef(0);
  const lastUnknownAt = useRef(0);
  const classifying = useRef(false);
  const movingRef = useRef(moving);
  const dictSeg = useRef(new SignSegmenter());
  /** Un semn static a fost trimis în timpul mișcării curente: nu o mai clasificăm și ca semn cu mișcare. */
  const staticFired = useRef(false);

  useEffect(() => {
    movingRef.current = moving;
  }, [moving]);

  useEffect(() => {
    engineRef.current = engine;
    segmenter.current.reset();
    gate.current.reset();
    try {
      localStorage.setItem(ENGINE_KEY, engine);
    } catch {
      // stocarea locală indisponibilă
    }
  }, [engine]);

  // Modelul ASL open source se încarcă o singură dată (≈1,5 MB).
  useEffect(() => {
    let cancelled = false;
    loadAslClassifier()
      .then((c) => {
        if (cancelled) return;
        aslRef.current = c;
        setAslStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setAslStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    samplesRef.current = samples;
  }, [samples]);
  useEffect(() => {
    dictRef.current = dictionary;
    allowedRef.current = new Set(dictionary.map((s) => s.id));
  }, [dictionary]);

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
      await commitSign(api, lesson, p.sign, prevSemafor.current, {
        confidence: Math.round(p.confidence * 100) / 100,
        manual: p.manual || undefined,
        prosody: p.prosody,
        ...p.extra,
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
    (sign: SignDef, confidence: number, manual: boolean, extra?: Pending["extra"]) => {
      if (pendingRef.current || !lesson || ended) return;
      const { text } = phraseFor(sign, lesson.terms);
      const p: Pending = {
        sign,
        text,
        confidence,
        manual,
        prosody: manual ? { rate: 1, pitch: 1 } : motion.current.prosody(),
        extra,
      };
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

  // --- Semn necunoscut ------------------------------------------------------
  const flagUnknown = useCallback(
    (meta: Pick<MessageMeta, "engine" | "top" | "confidence">) => {
      const now = Date.now();
      if (!lesson || ended || now - lastUnknownAt.current < UNKNOWN_COOLDOWN_MS) return;
      lastUnknownAt.current = now;
      setUnknownFlash({ id: now, top: meta.top });
      setTimeout(() => setUnknownFlash((u) => (u?.id === now ? null : u)), 3500);
      void reportUnknown(api, lesson, meta).catch(() => undefined);
    },
    [api, lesson, ended],
  );

  // --- Recunoașterea semnelor ------------------------------------------------
  const onFrame = useCallback(
    (frame: VisionFrame) => {
      motion.current.push(frame.hands);

      // Modelul ASL: un semn = mâna intră în cadru, semnează, apoi coboară.
      if (engineRef.current === "asl") {
        if (pendingRef.current || !frame.holistic) {
          segmenter.current.reset();
          return;
        }
        const clip = segmenter.current.push(frame.holistic);
        if (++frameCount.current % 3 === 0 && !classifying.current && segmenter.current.active) {
          setDetected({
            label: "Semnezi… coboară mâna la final",
            confidence: 0,
            stability: Math.min(1, segmenter.current.active / 30),
          });
        }
        const classifier = aslRef.current;
        if (!clip || !classifier) return;
        const win = toWindow(clip);
        if (!win.length) return;
        classifying.current = true;
        classifier(win)
          .then(({ top }) => {
            const [gloss, prob] = top[0] ?? ["", 0];
            if (prob < ASL_MIN_PROB) {
              setDetected({ label: "Semn necunoscut", confidence: prob, stability: 0 });
              flagUnknown({ engine: "asl", top, confidence: Math.round(prob * 100) / 100 });
              return;
            }
            const sign = aslToSign(gloss);
            setDetected({ label: `${sign.word} (ASL: ${gloss})`, confidence: prob, stability: 1 });
            startPending(sign, prob, false, { engine: "asl", asl: gloss, top });
          })
          .catch(() => setDetected({ label: "Eroare la model", confidence: 0, stability: 0 }))
          .finally(() => {
            classifying.current = false;
          });
        return;
      }

      // Semnele cu mișcare din dicționar (DTW): un semn = mâna intră, se mișcă, coboară.
      if (pendingRef.current || !frame.holistic) dictSeg.current.reset();
      else if (Object.keys(movingRef.current).length) {
        const clip = dictSeg.current.push(frame.holistic);
        if (clip) {
          const fired = staticFired.current;
          staticFired.current = false;
          const seq = fired ? null : sequenceFeatures(clip);
          const mp = seq ? classifyMoving(seq, movingRef.current, allowedRef.current) : null;
          if (mp?.known) {
            const sign = findSign(dictRef.current, mp.label);
            if (sign) {
              setDetected({ label: `${sign.word} (mișcare)`, confidence: mp.confidence, stability: 1 });
              startPending(sign, mp.confidence, false, { engine: "dictionar" });
              return;
            }
          } else if (mp) {
            setDetected({ label: "Semn necunoscut", confidence: mp.confidence, stability: 0 });
            flagUnknown({ engine: "dictionar", confidence: mp.confidence });
          }
        }
      }

      // Dicționarul antrenat (k-NN peste modelul LSR Translator).
      const features = extractFeatures(frame.hands);
      const pred = features ? classify(features, samplesRef.current, allowedRef.current) : null;
      const stable = pendingRef.current ? null : gate.current.push(pred);
      const isUnknown = !!pred && pred.label === NONE_SIGN && pred.match < MIN_MATCH_SCORE;
      unknownStreak.current = isUnknown && motion.current.speed < 0.012 ? unknownStreak.current + 1 : 0;
      if (pred && unknownStreak.current >= UNKNOWN_STREAK && !pendingRef.current) {
        unknownStreak.current = 0;
        flagUnknown({ engine: "dictionar", confidence: Math.round(pred.match * 100) / 100 });
      }
      if (++frameCount.current % 3 === 0 || stable) {
        const def = pred ? findSign(dictRef.current, pred.label) : undefined;
        setDetected({
          label: pred ? (def?.word ?? (isUnknown ? "Semn necunoscut" : "Fără semn")) : null,
          confidence: pred?.confidence ?? 0,
          stability: gate.current.progress,
        });
      }
      if (stable) {
        const sign = findSign(dictRef.current, stable);
        if (sign) {
          staticFired.current = true;
          startPending(sign, pred?.confidence ?? 0, false, { engine: "dictionar" });
        }
      }
    },
    [startPending, flagUnknown],
  );

  const tracker = useHandTracker(onFrame, "#6C93FF", "holistic");
  const privacy = useFacePrivacy(tracker.videoRef, tracker.status === "ready", registration, tracker.handBoxesRef);

  // Tastele 1–9 (plasa de siguranță) și Esc pentru anulare.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input, textarea, select")) return;
      if (e.key === "Escape") return cancelPending();
      const sign = signByKey(dictionary, e.key);
      if (sign) startPending(sign, 1, true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [startPending, cancelPending, dictionary]);

  const trainedSet = useMemo(() => new Set(trainedWords(samples)), [samples]);
  const trained = useMemo(
    () => dictionary.filter((s) => trainedSet.has(s.id) || (moving[s.id]?.length ?? 0) > 0).length,
    [dictionary, trainedSet, moving],
  );
  const groups = useMemo(() => {
    const by = new Map<SignCategory, SignDef[]>();
    for (const s of dictionary) by.set(s.category, [...(by.get(s.category) ?? []), s]);
    return by;
  }, [dictionary]);
  const captions = useMemo(() => messages.slice(-30), [messages]);
  const lang = profile.language;
  const toTranslate = useMemo(
    () => captions.filter((m) => m.sender_role === "teacher" && m.kind !== "system").map((m) => ({ id: m.id, text: m.text })),
    [captions],
  );
  const { translations, status: translationStatus } = useTranslations(toTranslate, lang);

  if (api.error) return <ErrorScreen message={api.error} />;
  if (!lesson) return <LoadingScreen />;

  return (
    <>
    <StationBand logoHref="/panou" right={<AccountMenu profile={profile} />}>
      <p className="min-w-0 truncate">
        <span className="block truncate text-lg font-bold leading-tight">{lesson.title}</span>
        <span className="block truncate text-sm text-muted-foreground">{lesson.subject}</span>
      </p>
    </StationBand>
    <main className="mx-auto grid w-full max-w-7xl flex-1 gap-4 px-4 pb-10 pt-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_26rem]">
      <BuzzBanner buzz={buzz} />

      <div className="flex min-w-0 flex-col gap-4">
        <div className="rounded-md border border-steel/80 bg-white px-3 py-2.5">
          <LineMap
            connection={connection}
            stations={[
              { key: "t", label: "Profesor", line: "prof", on: connected.teacher },
              { key: "s", label: "Tu", line: "elev", on: true, here: true },
              { key: "d", label: "Masa", line: "elev", on: connected.desk },
            ]}
          />
        </div>

        {!registration && !gateDismissed ? (
          <section aria-labelledby="inregistrare" className="rounded-xl border-4 border-elev bg-white p-4">
            <h2 id="inregistrare" className="flex items-center gap-2 font-display text-xl font-semibold">
              <ScanFace className="size-6 text-elev" aria-hidden />
              Mai întâi: înregistrează elevul
            </h2>
            <p className="mt-1 text-muted-foreground">
              O scanare scurtă a feței, păstrată doar pe acest dispozitiv. Apoi camera îi lasă vizibilă doar fața elevului și le
              estompează pe ale colegilor.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href={`/elev/inregistrare?next=/elev/${lesson.code}`} className={cn(buttonVariants({ size: "lg" }))}>
                <ScanFace aria-hidden />
                Înregistrează-mă
              </Link>
              <Button size="lg" variant="outline" onClick={() => setGateDismissed(true)}>
                Continuă fără
              </Button>
            </div>
          </section>
        ) : null}

        <Insigna
          variant="elev"
          title={profile.display_name}
          state={pending ? "semneaza" : semafor}
          pulse={!!pending || semafor === "neinteles"}
        >
          {seen ? (
            <p className="flex items-center gap-2 rounded-lg bg-white px-4 py-3 text-xl font-bold text-ink" role="status">
              <Eye className="size-6 text-ink" aria-hidden />
              Profesorul a văzut
            </p>
          ) : null}
        </Insigna>

        {ended && summary ? (
          <>
            <LessonMemory summary={summary} title={lesson.title} lang={lang} />
            <FeedbackForm lessonId={lesson.id} role="student" />
            <LessonStatsPanel messages={messages} code={lesson.code} />
          </>
        ) : null}

        <Panel id="subtitrari" tone="elev" title="Subtitrări" className="flex min-h-[40dvh] flex-col" bodyClassName="flex flex-1 flex-col">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <LanguageSelect
              id="student-lang"
              label="Traduce în"
              value={lang}
              className="w-full sm:w-64"
              onChange={(language) => void updateProfile({ language }).catch(() => undefined)}
            />
          </div>
          {translationStatus === "error" ? (
            <p className="mb-3 rounded-md bg-warn-soft px-3 py-2 text-sm font-bold text-warn-ink" role="status">
              Traducerea nu e disponibilă acum. Textul apare în română; reîncerc singur.
            </p>
          ) : null}
          <MessageList
            messages={captions}
            interim={interim}
            size="lg"
            className="max-h-[60dvh] flex-1"
            emptyText="Când profesorul vorbește, textul apare aici."
            translations={translations}
            lang={lang}
          />
        </Panel>

        <GlossaryPanel lesson={lesson} lang={lang} />
      </div>

      <div className="flex flex-col gap-4">
        <div className="rounded-xl border border-border bg-white p-3">
          <p className="mb-2 flex items-center gap-2 px-1 text-sm font-bold text-muted-foreground">
            <Cpu className="size-4" aria-hidden />
            Recunoaștere
          </p>
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Modul de recunoaștere">
            <Button
              role="radio"
              aria-checked={engine === "asl"}
              variant={engine === "asl" ? "default" : "outline"}
              className="h-auto min-h-14 flex-col items-start gap-0 whitespace-normal py-2 text-left"
              onClick={() => setEngine("asl")}
            >
              <span className="font-bold">Model ASL</span>
              <span className="text-xs font-normal opacity-80">
                {aslStatus === "ready" ? `${Object.keys(ASL_RO).length} semne, open source` : aslStatus === "loading" ? "Se încarcă…" : "Indisponibil"}
              </span>
            </Button>
            <Button
              role="radio"
              aria-checked={engine === "dictionar"}
              variant={engine === "dictionar" ? "default" : "outline"}
              className="h-auto min-h-14 flex-col items-start gap-0 whitespace-normal py-2 text-left"
              onClick={() => setEngine("dictionar")}
            >
              <span className="font-bold">Dicționarul meu</span>
              <span className="text-xs font-normal opacity-80">{trained} cuvinte antrenate</span>
            </Button>
          </div>
          <p className="mt-2 px-1 text-sm text-muted-foreground">
            {engine === "asl"
              ? "Ridică mâna, fă semnul ASL, apoi coboară mâna. Semnele nesigure apar ca „semn necunoscut”."
              : "Ține semnul nemișcat o clipă, sau fă un semn cu mișcare înregistrat (ridică mâna, semnează, coboară). Semnele care nu sunt în dicționar apar ca „semn necunoscut”."}
          </p>
          {aslStatus === "error" && engine === "asl" ? (
            <p className="mt-2 rounded-xl bg-danger-soft px-3 py-2 text-sm font-bold text-danger-ink" role="alert">
              Modelul ASL nu s-a putut încărca. Verifică internetul sau folosește dicționarul.
            </p>
          ) : null}
        </div>

        {unknownFlash ? (
          <div className="flex items-start gap-3 rounded-xl bg-warn-soft p-4 text-warn-ink" role="status" aria-live="assertive">
            <CircleHelp className="mt-0.5 size-7 shrink-0" aria-hidden />
            <div>
              <p className="font-display text-xl font-semibold">Semn necunoscut</p>
              <p className="text-sm font-bold">
                {unknownFlash.top?.length
                  ? `Cel mai apropiat: ${unknownFlash.top
                      .map(([g, pr]) => `${ASL_RO[g] ?? g} ${Math.round(pr * 100)}%`)
                      .join(" · ")}. Încearcă din nou sau atinge cuvântul.`
                  : "Nu e în dicționar. Încearcă din nou sau atinge cuvântul."}
              </p>
            </div>
          </div>
        ) : null}

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
          hint={tracker.hint}
          privacyCanvasRef={privacy.privacyCanvasRef}
          privacy={{ status: privacy.status, blurred: privacy.blurred, studentFound: privacy.studentFound, registered: !!registration }}
          overlay={
            pending ? (
              <div className="absolute inset-0 flex flex-col justify-end bg-elev/85 p-4" role="alertdialog" aria-label="Confirmă semnul">
                <p className="text-sm font-bold text-white/80">Se trimite…</p>
                <p className="font-display text-3xl font-semibold">{pending.text}</p>
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
          <p className="rounded-lg bg-warn-soft px-4 py-3 font-bold text-warn-ink">
            Nu ai semne antrenate pe acest dispozitiv. Antrenează-le sau folosește butoanele de mai jos.
          </p>
        ) : null}

        {sendError ? (
          <p className="rounded-lg bg-danger-soft px-4 py-3 font-bold text-danger-ink" role="alert">
            {sendError}
          </p>
        ) : null}

        {pending && tracker.status !== "ready" ? (
          <div className="rounded-xl bg-elev p-4 text-white" role="alertdialog" aria-label="Confirmă semnul">
            <p className="font-display text-2xl font-semibold">{pending.text}</p>
            <div className="my-3 h-3 overflow-hidden rounded-full bg-white/25">
              <div key={pending.text} className="confirm-bar h-full bg-white" style={{ ["--confirm-ms" as string]: `${CONFIRM_MS}ms` }} />
            </div>
            <Button size="lg" onClick={cancelPending} className="w-full bg-white text-ink hover:bg-white/90">
              <X aria-hidden />
              Anulează (Esc)
            </Button>
          </div>
        ) : null}

        <section aria-labelledby="dictionar" className="rounded-xl border border-border bg-white p-4">
          <h2 id="dictionar" className="mb-1 flex items-center gap-2 font-display text-xl font-semibold">
            <Hand className="size-5" aria-hidden />
            Dicționarul de semne
          </h2>
          <p className="mb-3 text-sm text-muted-foreground">
            Semnează în fața camerei. Dacă un semn nu e recunoscut, atinge cuvântul (sau tastele 1–9).
            Punctul verde arată cuvintele antrenate.
          </p>
          {(["clasa", "lsr", "personal"] as SignCategory[]).map((cat) => {
            const list = groups.get(cat) ?? [];
            if (!list.length) return null;
            return (
              <div key={cat} className="mb-3 last:mb-0">
                <h3 className="mb-2 text-sm font-bold text-muted-foreground">{CATEGORY_LABELS[cat]}</h3>
                <div className="grid grid-cols-2 gap-2">
                  {list.map((s) => (
                    <Button
                      key={s.id}
                      variant="outline"
                      className="h-auto min-h-12 justify-start whitespace-normal border-2 py-2 text-left"
                      onClick={() => startPending(s, 1, true)}
                      disabled={!!pending || ended}
                    >
                      {s.key ? <kbd className="rounded-md bg-ink px-2 py-0.5 font-mono text-sm text-white">{s.key}</kbd> : null}
                      <span className="flex-1 font-bold">{s.word}</span>
                      <span
                        className={cn("size-2.5 shrink-0 rounded-full", trainedSet.has(s.id) ? "bg-ink" : "bg-sem-neutru/50")}
                        aria-label={trainedSet.has(s.id) ? "antrenat" : "neantrenat"}
                      />
                    </Button>
                  ))}
                </div>
              </div>
            );
          })}
        </section>

        <SignGuide dictionary={dictionary} trained={trainedSet} onPick={
            ended
              ? undefined
              : (sign) =>
                  startPending(sign, 1, true, sign.category === "asl" ? { engine: "asl", asl: sign.id.replace(/^asl_/, "") } : undefined)
          }
        />

        <VoicePicker {...voice} terms={lesson.terms} />

        <Link href="/elev/antrenare" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "bg-white")}>
          <GraduationCap aria-hidden />
          Antrenează dicționarul ({trained}/{dictionary.length})
        </Link>
      </div>
    </main>
    </>
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
  const sample = phraseFor(BASE_DICTIONARY.find((s) => s.id === "termen")!, terms).text;
  return (
    <section aria-labelledby="vocea" className="rounded-xl border border-border bg-white p-4">
      <h2 id="vocea" className="mb-3 flex items-center gap-2 font-display text-xl font-semibold">
        <Volume2 className="size-5" aria-hidden />
        Vocea mea
      </h2>
      {loaded && voices.length === 0 ? (
        <p className="mb-3 rounded-xl bg-warn-soft px-3 py-2 text-sm font-bold text-warn-ink">
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
