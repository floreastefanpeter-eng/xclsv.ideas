"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Camera,
  CircleDot,
  Cloud,
  CloudOff,
  Download,
  FlaskConical,
  Loader2,
  Move,
  Plus,
  RotateCcw,
  Trash2,
  Upload,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CameraView } from "@/components/punte/camera-view";
import { StationBand } from "@/components/punte/station-band";
import { useHandTracker, type VisionFrame } from "@/hooks/use-hand-tracker";
import { useFacePrivacy, useRegistration } from "@/hooks/use-face-privacy";
import { SignSegmenter } from "@/lib/asl/preprocess";
import { classifyMoving, countMoving, sequenceFeatures } from "@/lib/moving-signs";
import { parseLsrExport, parseProfile, useSignProfile } from "@/hooks/use-sign-profile";
import {
  classify,
  countSamples,
  extractFeatures,
  StabilityGate,
  trainedWords,
} from "@/lib/knn";
import { CATEGORY_LABELS, findSign, NONE_DEF, NONE_SIGN, type SignCategory, type SignDef } from "@/lib/signs";
import { cn } from "@/lib/utils";

const COUNTDOWN_S = 3;
const COLLECT_MS = 2000;
const MAX_PER_WORD = 400;
const MOVING_MAX_MS = 5000;

type Phase =
  | { kind: "idle" }
  | { kind: "countdown"; id: string; n: number }
  | { kind: "collect"; id: string; count: number }
  | { kind: "moving"; id: string; frames: number };

export default function TrainingScreen() {
  const { profile, samples, moving, dictionary, setProfile, setSamples, addMoving, resetMoving, addWord, removeWord, sync } =
    useSignProfile();
  const registration = useRegistration();
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [testMode, setTestMode] = useState(false);
  const [detected, setDetected] = useState<{ label: string | null; confidence: number; stability: number }>({
    label: null,
    confidence: 0,
    stability: 0,
  });
  const [lastRecognized, setLastRecognized] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [newWord, setNewWord] = useState("");

  const phaseRef = useRef<Phase>(phase);
  const collected = useRef<number[][]>([]);
  const lastFeature = useRef<number[] | null>(null);
  const samplesRef = useRef(samples);
  const testRef = useRef(testMode);
  const gate = useRef(new StabilityGate());
  const frameCount = useRef(0);
  const fileInput = useRef<HTMLInputElement>(null);
  const movingSeg = useRef(new SignSegmenter(6, 4, 150));
  const testSeg = useRef(new SignSegmenter());
  const movingFrames = useRef<Float32Array[]>([]);
  const movingDone = useRef<((clip: Float32Array[] | null) => void) | null>(null);
  const movingRef = useRef(moving);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);
  useEffect(() => {
    samplesRef.current = samples;
  }, [samples]);
  useEffect(() => {
    testRef.current = testMode;
  }, [testMode]);
  useEffect(() => {
    movingRef.current = moving;
  }, [moving]);

  const labelOf = useCallback(
    (id: string) => (id === NONE_SIGN ? NONE_DEF.word : (findSign(dictionary, id)?.word ?? id)),
    [dictionary],
  );

  const onFrame = useCallback(
    (frame: VisionFrame) => {
      const features = extractFeatures(frame.hands);
      lastFeature.current = features;
      const p = phaseRef.current;
      if (p.kind === "moving" && frame.holistic) {
        const clip = movingSeg.current.push(frame.holistic);
        movingFrames.current.push(frame.holistic);
        if (movingFrames.current.length % 5 === 0) setPhase({ ...p, frames: movingFrames.current.length });
        if (clip) movingDone.current?.(clip);
        return;
      }
      if (p.kind === "collect") {
        if (features) {
          collected.current.push(features);
          if (collected.current.length % 4 === 0) setPhase({ ...p, count: collected.current.length });
        }
        return;
      }
      if (!testRef.current) return;
      // Semnele cu mișcare: un semn = mâna intră, se mișcă, apoi coboară.
      if (frame.holistic && Object.keys(movingRef.current).length) {
        const clip = testSeg.current.push(frame.holistic);
        const seq = clip ? sequenceFeatures(clip) : null;
        const mp = seq ? classifyMoving(seq, movingRef.current) : null;
        if (mp) setLastRecognized(mp.known ? `${labelOf(mp.label)} (mișcare, ${Math.round(mp.confidence * 100)}%)` : "Semn necunoscut (mișcare)");
      }
      // Modul „Testează”: arată live ce semn e recunoscut, fără să trimită nimic.
      const pred = features ? classify(features, samplesRef.current) : null;
      const stable = gate.current.push(pred);
      if (stable) setLastRecognized(labelOf(stable));
      if (++frameCount.current % 3 === 0) {
        setDetected({
          label: pred ? (pred.label === NONE_SIGN ? "Semn necunoscut" : labelOf(pred.label)) : null,
          confidence: pred?.confidence ?? 0,
          stability: gate.current.progress,
        });
      }
    },
    [labelOf],
  );

  const tracker = useHandTracker(onFrame, "#6C93FF", "holistic");
  const privacy = useFacePrivacy(tracker.videoRef, tracker.status === "ready", registration, tracker.handBoxesRef);

  /** Semn cu mișcare: numărătoare inversă, apoi până coboară mâna (cel mult 5 s). */
  const recordMoving = useCallback(
    async (id: string) => {
      if (phaseRef.current.kind !== "idle") return;
      if (tracker.status !== "ready") await tracker.start();
      setTestMode(false);
      for (let n = COUNTDOWN_S; n > 0; n--) {
        setPhase({ kind: "countdown", id, n });
        await new Promise((r) => setTimeout(r, 1000));
      }
      movingSeg.current.reset();
      movingFrames.current = [];
      setPhase({ kind: "moving", id, frames: 0 });
      const clip = await new Promise<Float32Array[] | null>((resolve) => {
        movingDone.current = resolve;
        setTimeout(() => resolve(null), MOVING_MAX_MS);
      });
      movingDone.current = null;
      const frames = clip ?? movingFrames.current;
      movingFrames.current = [];
      setPhase({ kind: "idle" });
      const seq = sequenceFeatures(frames);
      if (!seq) {
        setMessage({ ok: false, text: "Nu am văzut destul: stai cu umerii în cadru, ridică mâna, fă semnul și coboar-o." });
        return;
      }
      addMoving(id, seq);
      setMessage({ ok: true, text: `Mișcare salvată pentru „${labelOf(id)}”. Fă 3–5 înregistrări pe semn.` });
    },
    [tracker, addMoving, labelOf],
  );

  const addFrames = useCallback(
    (id: string, frames: number[][]) => {
      if (!frames.length) return;
      setSamples((prev) => ({ ...prev, [id]: [...(prev[id] ?? []), ...frames].slice(-MAX_PER_WORD) }));
    },
    [setSamples],
  );

  /** Înregistrare de 2 secunde, după o numărătoare inversă. */
  const record = useCallback(
    async (id: string) => {
      if (phaseRef.current.kind !== "idle") return;
      if (tracker.status !== "ready") await tracker.start();
      setTestMode(false);
      for (let n = COUNTDOWN_S; n > 0; n--) {
        setPhase({ kind: "countdown", id, n });
        await new Promise((r) => setTimeout(r, 1000));
      }
      collected.current = [];
      setPhase({ kind: "collect", id, count: 0 });
      await new Promise((r) => setTimeout(r, COLLECT_MS));
      const frames = collected.current;
      collected.current = [];
      setPhase({ kind: "idle" });
      if (frames.length) {
        addFrames(id, frames);
        setMessage({ ok: true, text: `${frames.length} cadre salvate pentru „${labelOf(id)}”.` });
      } else {
        setMessage({ ok: false, text: "Nu am văzut nicio mână. Stai în fața camerei și încearcă din nou." });
      }
    },
    [tracker, addFrames, labelOf],
  );

  /** „Salvează exemplul” din LSR Translator: un singur cadru, acum. */
  const snapshot = useCallback(
    (id: string) => {
      const f = lastFeature.current;
      if (tracker.status !== "ready") {
        setMessage({ ok: false, text: "Pornește camera mai întâi." });
        return;
      }
      if (!f) {
        setMessage({ ok: false, text: "Nu a fost detectată nicio mână. Fă semnul în fața camerei." });
        return;
      }
      addFrames(id, [f]);
      setMessage({ ok: true, text: `Exemplu salvat pentru „${labelOf(id)}”.` });
    },
    [tracker.status, addFrames, labelOf],
  );

  const reset = (id: string) =>
    setSamples((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });

  const exportJson = () => {
    const blob = new Blob([JSON.stringify({ app: "punte", ...profile })], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "punte-dictionar-semne.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const importJson = async (file: File) => {
    setMessage(null);
    try {
      const parsed = JSON.parse(await file.text());
      const punte = parseProfile(parsed);
      if (punte) {
        setProfile(punte);
        setMessage({ ok: true, text: `Am importat ${countSamples(punte.samples)} exemple.` });
        return;
      }
      const lsr = parseLsrExport(parsed, profile);
      if (lsr) {
        setProfile(lsr);
        setMessage({ ok: true, text: "Am importat baza din LSR Translator." });
        return;
      }
      throw new Error();
    } catch {
      setMessage({ ok: false, text: "Fișierul nu este un export SIGNals sau LSR Translator valid." });
    }
  };

  const total = useMemo(() => countSamples(samples) + countMoving(moving), [samples, moving]);
  const trained = useMemo(
    () => new Set([...trainedWords(samples), ...Object.keys(moving).filter((k) => moving[k].length)]).size,
    [samples, moving],
  );
  const busy = phase.kind !== "idle";
  const groups = useMemo(() => {
    const by = new Map<SignCategory, SignDef[]>();
    for (const s of dictionary) by.set(s.category, [...(by.get(s.category) ?? []), s]);
    return by;
  }, [dictionary]);

  const overlay =
    phase.kind === "countdown" ? (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/55 text-center" role="status" aria-live="assertive">
        <p className="text-xl font-bold">Pregătește semnul „{labelOf(phase.id)}”</p>
        <p className="font-display text-8xl font-black">{phase.n}</p>
      </div>
    ) : phase.kind === "moving" ? (
      <div className="absolute inset-x-0 bottom-0 flex items-center gap-3 bg-sem-neinteles px-4 py-3 font-bold" role="status" aria-live="polite">
        <CircleDot className="size-6 animate-pulse" aria-hidden />
        Fă semnul „{labelOf(phase.id)}”, apoi coboară mâna… {phase.frames} cadre
      </div>
    ) : phase.kind === "collect" ? (
      <div className="absolute inset-x-0 bottom-0 flex items-center gap-3 bg-sem-neinteles px-4 py-3 font-bold" role="status" aria-live="polite">
        <CircleDot className="size-6 animate-pulse" aria-hidden />
        Înregistrez „{labelOf(phase.id)}”… {phase.count} cadre
      </div>
    ) : null;

  const wordCard = (s: { id: string; word: string; phrase?: string; hint?: string; key?: string; category?: SignCategory }, wide = false) => {
    const count = samples[s.id]?.length ?? 0;
    const movingCount = moving[s.id]?.length ?? 0;
    return (
      <li
        key={s.id}
        className={cn("flex flex-col gap-3 rounded-xl border-2 bg-white p-4", count + movingCount > 0 ? "border-sem-inteles" : "border-transparent", wide && "sm:col-span-2")}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="flex items-center gap-2 font-display text-xl font-extrabold">
              {s.key ? <kbd className="rounded-md bg-ink px-2 py-0.5 font-mono text-sm text-white">{s.key}</kbd> : null}
              {s.word}
            </h3>
            {s.phrase ? <p className="font-bold text-elev">„{s.phrase}”</p> : null}
            {s.hint ? <p className="mt-1 text-sm text-muted-foreground">{s.hint}</p> : null}
          </div>
          <span
            className={cn(
              "shrink-0 rounded-full px-3 py-1 text-sm font-bold tabular-nums",
              count + movingCount > 0 ? "bg-ok-soft text-sem-inteles" : "bg-muted text-muted-foreground",
            )}
          >
            {count} cadre · {movingCount} mișcări
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button className="flex-1" onClick={() => record(s.id)} disabled={busy}>
            <CircleDot aria-hidden />
            Înregistrează 2 s
          </Button>
          <Button variant="secondary" onClick={() => snapshot(s.id)} disabled={busy} aria-label={`Salvează un exemplu pentru ${s.word}`}>
            <Camera aria-hidden />
            Un cadru
          </Button>
          {s.id !== NONE_SIGN ? (
            <Button variant="secondary" onClick={() => recordMoving(s.id)} disabled={busy} aria-label={`Înregistrează semnul cu mișcare pentru ${s.word}`}>
              <Move aria-hidden />
              Mișcare
            </Button>
          ) : null}
          <Button
            variant="outline"
            onClick={() => {
              reset(s.id);
              resetMoving(s.id);
            }}
            disabled={busy || count + movingCount === 0}
            aria-label={`Resetează ${s.word}`}
          >
            <RotateCcw aria-hidden />
          </Button>
          {s.category === "personal" ? (
            <Button variant="outline" onClick={() => removeWord(s.id)} disabled={busy} aria-label={`Șterge cuvântul ${s.word} din dicționar`}>
              <Trash2 aria-hidden />
            </Button>
          ) : null}
        </div>
      </li>
    );
  };

  return (
    <>
    <StationBand logoHref="/panou">
      <p className="truncate text-lg font-bold">Dicționarul meu de semne</p>
    </StationBand>
    <main className="mx-auto grid w-full max-w-7xl flex-1 gap-5 px-4 pb-10 pt-4 sm:px-6 lg:grid-cols-[420px_minmax(0,1fr)]">
      <div className="flex flex-col gap-4 lg:sticky lg:top-24 lg:h-fit">
        <header className="flex items-center justify-end gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-sm font-bold" role="status">
            {sync === "saved" ? (
              <Cloud className="size-4 text-sem-inteles" aria-hidden />
            ) : sync === "saving" || sync === "loading" ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <CloudOff className="size-4 text-sem-intrebare" aria-hidden />
            )}
            {sync === "saved" ? "Salvat în cont" : sync === "saving" ? "Se salvează…" : sync === "loading" ? "Se încarcă…" : "Salvat doar local"}
          </span>
        </header>
        <div>
          <h1 className="font-display text-3xl font-extrabold">Dicționarul de semne</h1>
          <p className="mt-1 text-lg text-ink/80">
            Semne statice: 2–3 înregistrări de 2 secunde sau 20–50 de cadre. Semne cu mișcare (de exemplu semne LSR): 3–5 înregistrări cu „Mișcare”, cu umerii în cadru.
          </p>
        </div>
        <CameraView
          videoRef={tracker.videoRef}
          canvasRef={tracker.canvasRef}
          status={tracker.status}
          error={tracker.error}
          handsVisible={tracker.handsVisible}
          label={testMode ? detected.label : phase.kind === "collect" ? labelOf(phase.id) : null}
          confidence={testMode ? detected.confidence : 0}
          stability={testMode ? detected.stability : 0}
          onStart={tracker.start}
          onStop={tracker.stop}
          overlay={overlay}
          hint={tracker.hint}
          privacyCanvasRef={privacy.privacyCanvasRef}
          privacy={{ status: privacy.status, blurred: privacy.blurred, studentFound: privacy.studentFound, registered: !!registration }}
        />
        <div className="grid grid-cols-2 gap-2">
          <Button
            size="lg"
            variant={testMode ? "default" : "outline"}
            className={cn(!testMode && "bg-white")}
            onClick={async () => {
              if (tracker.status !== "ready") await tracker.start();
              gate.current.reset();
              setLastRecognized(null);
              setTestMode((v) => !v);
            }}
            disabled={busy || total === 0}
            aria-pressed={testMode}
          >
            <FlaskConical aria-hidden />
            {testMode ? "Oprește testul" : "Testează"}
          </Button>
          <Link href="/" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "bg-white")}>
            <ArrowLeft aria-hidden />
            Înapoi
          </Link>
        </div>
        {testMode ? (
          <p className="rounded-lg bg-elev px-4 py-3 text-lg font-bold text-white" role="status" aria-live="polite">
            {lastRecognized ? `Recunoscut: ${lastRecognized}` : "Fă un semn. Nu se trimite nimic."}
          </p>
        ) : null}
        {message ? (
          <p
            className={cn("rounded-lg px-4 py-3 font-bold", message.ok ? "bg-ok-soft text-ok-ink" : "bg-danger-soft text-danger-ink")}
            role={message.ok ? "status" : "alert"}
          >
            {message.text}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white p-4 border border-border">
          <p className="text-lg font-bold">
            {trained}/{dictionary.length} cuvinte antrenate · {total} exemple
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={exportJson} disabled={total === 0 && profile.dictionary.length === 0}>
              <Download aria-hidden />
              Exportă JSON
            </Button>
            <Button variant="outline" onClick={() => fileInput.current?.click()}>
              <Upload aria-hidden />
              Importă JSON
            </Button>
            <input
              ref={fileInput}
              type="file"
              accept="application/json,.json"
              className="sr-only"
              tabIndex={-1}
              aria-hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void importJson(f);
                e.target.value = "";
              }}
            />
          </div>
          <p className="w-full text-sm text-muted-foreground">
            Importul acceptă și baza din LSR Translator (lista de exemple „lsr_samples_v1”).
          </p>
        </div>

        <form
          className="flex flex-col gap-2 rounded-xl bg-white p-4 border border-border sm:flex-row sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            const id = addWord(newWord);
            if (id) {
              setMessage({ ok: true, text: `„${newWord.trim().toUpperCase()}” a fost adăugat în dicționar. Antrenează-l mai jos.` });
              setNewWord("");
            }
          }}
        >
          <div className="flex-1 space-y-1.5">
            <label htmlFor="new-word" className="block font-bold">
              Adaugă un cuvânt în dicționar
            </label>
            <Input id="new-word" value={newWord} onChange={(e) => setNewWord(e.target.value)} placeholder="de exemplu: PAUZĂ" />
          </div>
          <Button type="submit" disabled={!newWord.trim()}>
            <Plus aria-hidden />
            Adaugă
          </Button>
        </form>

        {(["clasa", "lsr", "personal"] as SignCategory[]).map((cat) => {
          const list = groups.get(cat) ?? [];
          if (!list.length) return null;
          return (
            <section key={cat} aria-labelledby={`cat-${cat}`}>
              <h2 id={`cat-${cat}`} className="mb-3 font-display text-2xl font-extrabold">
                {CATEGORY_LABELS[cat]}
              </h2>
              <ul className="grid gap-3 sm:grid-cols-2">{list.map((s) => wordCard(s))}</ul>
            </section>
          );
        })}

        <section aria-labelledby="cat-none">
          <h2 id="cat-none" className="mb-3 font-display text-2xl font-extrabold">
            Repaus
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2">{wordCard({ id: NONE_SIGN, word: NONE_DEF.word, hint: NONE_DEF.hint }, true)}</ul>
        </section>

        <p className="text-sm text-muted-foreground">
          Se salvează doar pozițiile punctelor mâinii (landmark-uri), niciodată imagini sau video.
        </p>
      </div>
    </main>
    </>
  );
}
