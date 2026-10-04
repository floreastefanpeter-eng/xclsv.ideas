"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, CircleDot, Cloud, CloudOff, Download, FlaskConical, Loader2, RotateCcw, Upload } from "lucide-react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { CameraView } from "@/components/punte/camera-view";
import { Logo } from "@/components/punte/logo";
import { useHandTracker } from "@/hooks/use-hand-tracker";
import { useSignProfile } from "@/hooks/use-sign-profile";
import {
  classify,
  countSamples,
  extractFeatures,
  isSamples,
  StabilityGate,
  trainedSignCount,
  type HandFrame,
  type Samples,
} from "@/lib/knn";
import { getSign, NONE_SIGN, TRAIN_LABELS, type TrainLabel } from "@/lib/signs";
import { cn } from "@/lib/utils";

const COUNTDOWN_S = 3;
const COLLECT_MS = 2000;
const MAX_PER_LABEL = 400;

type Phase = { kind: "idle" } | { kind: "countdown"; label: TrainLabel; n: number } | { kind: "collect"; label: TrainLabel; count: number };

export default function TrainingScreen() {
  const { samples, setSamples, sync } = useSignProfile();
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [testMode, setTestMode] = useState(false);
  const [detected, setDetected] = useState<{ label: string | null; confidence: number; stability: number }>({
    label: null,
    confidence: 0,
    stability: 0,
  });
  const [lastRecognized, setLastRecognized] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const phaseRef = useRef<Phase>(phase);
  const collected = useRef<number[][]>([]);
  const samplesRef = useRef(samples);
  const testRef = useRef(testMode);
  const gate = useRef(new StabilityGate());
  const frameCount = useRef(0);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);
  useEffect(() => {
    samplesRef.current = samples;
  }, [samples]);
  useEffect(() => {
    testRef.current = testMode;
  }, [testMode]);

  const onFrame = useCallback((frame: HandFrame) => {
    const features = extractFeatures(frame);
    const p = phaseRef.current;
    if (p.kind === "collect") {
      if (features) {
        collected.current.push(features);
        if (collected.current.length % 4 === 0) setPhase({ ...p, count: collected.current.length });
      }
      return;
    }
    if (!testRef.current) return;
    // Modul „Testează”: arată live ce semn e recunoscut, fără să trimită nimic.
    const pred = features ? classify(features, samplesRef.current) : null;
    const stable = gate.current.push(pred);
    if (stable) setLastRecognized(getSign(stable)?.label ?? null);
    if (++frameCount.current % 3 === 0) {
      setDetected({
        label: pred ? (getSign(pred.label)?.label ?? "Fără semn") : null,
        confidence: pred?.confidence ?? 0,
        stability: gate.current.progress,
      });
    }
  }, []);

  const tracker = useHandTracker(onFrame, "#93C5FD");

  const record = useCallback(
    async (label: TrainLabel) => {
      if (phaseRef.current.kind !== "idle") return;
      if (tracker.status !== "ready") await tracker.start();
      setTestMode(false);
      for (let n = COUNTDOWN_S; n > 0; n--) {
        setPhase({ kind: "countdown", label, n });
        await new Promise((r) => setTimeout(r, 1000));
      }
      collected.current = [];
      setPhase({ kind: "collect", label, count: 0 });
      await new Promise((r) => setTimeout(r, COLLECT_MS));
      const frames = collected.current;
      collected.current = [];
      setPhase({ kind: "idle" });
      if (frames.length) {
        setSamples((prev) => ({ ...prev, [label]: [...(prev[label] ?? []), ...frames].slice(-MAX_PER_LABEL) }));
      }
    },
    [tracker, setSamples],
  );

  const reset = (label: TrainLabel) =>
    setSamples((prev) => {
      const next = { ...prev };
      delete next[label];
      return next;
    });

  const exportJson = () => {
    const blob = new Blob([JSON.stringify({ app: "punte", version: 1, samples }, null, 0)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "punte-semne.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const importJson = async (file: File) => {
    setImportError(null);
    try {
      const parsed = JSON.parse(await file.text());
      const data: unknown = parsed?.samples ?? parsed;
      if (!isSamples(data)) throw new Error();
      setSamples(data as Samples);
    } catch {
      setImportError("Fișierul nu este un export Punte valid.");
    }
  };

  const total = useMemo(() => countSamples(samples), [samples]);
  const trained = useMemo(() => trainedSignCount(samples), [samples]);
  const busy = phase.kind !== "idle";

  const overlay =
    phase.kind === "countdown" ? (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/55 text-center" role="status" aria-live="assertive">
        <p className="text-xl font-bold">Pregătește semnul „{labelOf(phase.label)}”</p>
        <p className="font-display text-8xl font-black">{phase.n}</p>
      </div>
    ) : phase.kind === "collect" ? (
      <div className="absolute inset-x-0 bottom-0 flex items-center gap-3 bg-sem-neinteles px-4 py-3 font-bold" role="status" aria-live="polite">
        <CircleDot className="size-6 animate-pulse" aria-hidden />
        Înregistrez „{labelOf(phase.label)}”… {phase.count} cadre
      </div>
    ) : null;

  return (
    <main className="mx-auto grid w-full max-w-6xl flex-1 gap-5 px-4 pb-10 pt-4 lg:grid-cols-[420px_minmax(0,1fr)]">
      <div className="flex flex-col gap-4 lg:sticky lg:top-4 lg:h-fit">
        <header className="flex items-center justify-between gap-3">
          <Logo />
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-sm font-bold" role="status">
            {sync === "saved" ? (
              <Cloud className="size-4 text-sem-inteles" aria-hidden />
            ) : sync === "saving" || sync === "loading" ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <CloudOff className="size-4 text-sem-intrebare" aria-hidden />
            )}
            {sync === "saved"
              ? "Salvat în cont"
              : sync === "saving"
                ? "Se salvează…"
                : sync === "loading"
                  ? "Se încarcă…"
                  : "Salvat doar local"}
          </span>
        </header>
        <div>
          <h1 className="font-display text-3xl font-extrabold">Antrenează semnele</h1>
          <p className="mt-1 text-lg text-ink/80">
            Arată fiecare semn camerei timp de 2 secunde. Fă 2–3 înregistrări pe semn, în aceeași lumină ca la lecție.
          </p>
        </div>
        <CameraView
          videoRef={tracker.videoRef}
          canvasRef={tracker.canvasRef}
          status={tracker.status}
          error={tracker.error}
          handsVisible={tracker.handsVisible}
          label={testMode ? detected.label : phase.kind === "collect" ? labelOf(phase.label) : null}
          confidence={testMode ? detected.confidence : 0}
          stability={testMode ? detected.stability : 0}
          onStart={tracker.start}
          onStop={tracker.stop}
          overlay={overlay}
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
          <p className="rounded-2xl bg-elev px-4 py-3 text-lg font-bold text-white" role="status" aria-live="polite">
            {lastRecognized ? `Recunoscut: ${lastRecognized}` : "Fă un semn. Nu se trimite nimic."}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl bg-white p-4 shadow-sm">
          <p className="text-lg font-bold">
            {trained}/6 semne antrenate · {total} cadre
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={exportJson} disabled={total === 0}>
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
          {importError ? (
            <p className="w-full font-bold text-sem-neinteles" role="alert">
              {importError}
            </p>
          ) : null}
        </div>

        <ul className="grid gap-3 sm:grid-cols-2">
          {TRAIN_LABELS.map((l) => {
            const count = samples[l.id]?.length ?? 0;
            const def = getSign(l.id);
            const isNone = l.id === NONE_SIGN;
            return (
              <li
                key={l.id}
                className={cn(
                  "flex flex-col gap-3 rounded-3xl border-2 bg-white p-4",
                  count > 0 ? "border-sem-inteles" : "border-transparent",
                  isNone && "sm:col-span-2",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="flex items-center gap-2 font-display text-xl font-extrabold">
                      {def ? <kbd className="rounded-md bg-ink px-2 py-0.5 font-mono text-sm text-white">{def.key}</kbd> : null}
                      {l.label}
                    </h2>
                    {def ? <p className="font-bold text-elev">„{def.phrase}”</p> : null}
                    <p className="mt-1 text-sm text-muted-foreground">{l.hint}</p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-3 py-1 text-sm font-bold tabular-nums",
                      count > 0 ? "bg-[#DCFCE7] text-sem-inteles" : "bg-muted text-muted-foreground",
                    )}
                  >
                    {count} cadre
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button className="flex-1" onClick={() => record(l.id)} disabled={busy}>
                    <CircleDot aria-hidden />
                    {count > 0 ? "Încă o înregistrare" : "Înregistrează"}
                  </Button>
                  <Button variant="outline" onClick={() => reset(l.id)} disabled={busy || count === 0} aria-label={`Resetează ${l.label}`}>
                    <RotateCcw aria-hidden />
                    <span className="hidden sm:inline">Resetează</span>
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
        <p className="text-sm text-muted-foreground">
          Se salvează doar pozițiile punctelor mâinii (landmark-uri), niciodată imagini sau video.
        </p>
      </div>
    </main>
  );
}

function labelOf(id: TrainLabel) {
  return TRAIN_LABELS.find((l) => l.id === id)?.label ?? id;
}
