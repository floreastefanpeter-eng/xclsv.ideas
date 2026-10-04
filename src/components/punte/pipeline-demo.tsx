"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Hand, Languages, Mic, MonitorSmartphone, Pause, Play, RotateCcw, Sparkles, Type, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Direction = "prof" | "elev";

interface Stage {
  id: string;
  label: string;
  icon: typeof Mic;
  detail: string;
}

/** Ce se întâmplă în fiecare etapă: doar ce face aplicația, fără promisiuni în plus. */
const STAGES: Record<Direction, Stage[]> = {
  prof: [
    { id: "prof", label: "Profesor", icon: Mic, detail: "Profesorul vorbește normal, cu telefonul în buzunar sau pe catedră. Nu are nimic de configurat în timpul lecției." },
    { id: "voce", label: "Voce", icon: Volume2, detail: "Microfonul transformă vorbirea în text în timp ce e rostită (recunoaștere vocală în română, în Chrome și Edge)." },
    { id: "text", label: "Text", icon: Type, detail: "Fraza finală devine mesaj în lecție. AI-ul notează termenii-cheie și îi explică simplu, fără ca profesorul să-i scrie." },
    { id: "trad", label: "Traducere", icon: Languages, detail: "Pentru elev, fraza e tradusă în limba aleasă (10 limbi). Originalul românesc apare imediat; traducerea vine imediat după." },
    { id: "elev", label: "Elev", icon: MonitorSmartphone, detail: "Pe telefonul sau tableta de pe bancă, textul apare mare. Numele strigat, tema sau o întrebare vin și ca vibrație." },
  ],
  elev: [
    { id: "elev", label: "Elev", icon: Hand, detail: "Elevul semnează în fața camerei. Video-ul nu părăsește dispozitivul, iar fețele colegilor sunt estompate." },
    { id: "semn", label: "Semn", icon: Sparkles, detail: "Modelul ASL open source (250 de semne) sau dicționarul antrenat de elev recunoaște semnul. Sub 50% încredere, semnul e raportat ca necunoscut." },
    { id: "text", label: "Text", icon: Type, detail: "Semnul devine fraza lui, după o confirmare de 1,5 s pe care elevul o poate anula. Un semn personal poate rosti o frază întreagă." },
    { id: "voce", label: "Voce", icon: Volume2, detail: "Telefonul profesorului rostește fraza cu sinteza vocală a browserului, în vocea aleasă de elev." },
    { id: "prof", label: "Profesor", icon: MonitorSmartphone, detail: "Dacă elevul nu a înțeles sau vrea să intervină, insigna profesorului se aprinde și vibrează până apasă „Am văzut”." },
  ],
};

/** Exemplul de lecție (date sintetice, etichetate ca atare pe pagină). */
const SCRIPT: Record<Direction, { source: string; output: string; extra: string; signal: string; confidence: number }[]> = {
  prof: [
    {
      source: "Clorofila este pigmentul verde din frunze.",
      output: "Chlorophyll is the green pigment in leaves.",
      extra: "Termen nou: clorofilă — substanța verde care prinde lumina.",
      signal: "ro-RO",
      confidence: 0.94,
    },
    {
      source: "Tema pentru mâine: exercițiile 1, 2 și 3 de la pagina 42.",
      output: "Homework for tomorrow: exercises 1, 2 and 3 on page 42.",
      extra: "Alertă pe telefonul elevului: s-a anunțat tema.",
      signal: "ro-RO",
      confidence: 0.91,
    },
  ],
  elev: [
    { source: "why", output: "De ce?", extra: "Insigna profesorului: Andrei vrea să intervină.", signal: "ASL", confidence: 0.86 },
    {
      source: "PREZENTARE",
      output: "Bună! Sunt elev la Colegiul Național de Informatică Tudor Vianu.",
      extra: "Rostit pe telefonul profesorului.",
      signal: "Dicționarul meu",
      confidence: 0.92,
    },
  ],
};

/** Durata fiecărei etape (ms), apoi pauza de la final. */
const STEP_MS = [900, 1300, 1600, 1100, 2400];

function Wave({ active, dark }: { active: boolean; dark?: boolean }) {
  const heights = [40, 75, 55, 95, 60, 85, 45, 70, 50];
  return (
    <span aria-hidden className={cn("flex h-8 items-center gap-[3px]", active && "wave")}>
      {heights.map((h, i) => (
        <span
          key={i}
          className={cn("w-[3px] rounded-full transition-colors", active ? "bg-prof" : dark ? "bg-white/25" : "bg-ink/20")}
          style={{ height: `${h}%`, animationDelay: `${i * 90}ms`, transform: active ? undefined : "scaleY(0.4)" }}
        />
      ))}
    </span>
  );
}

/**
 * Demo-ul interactiv al fluxului: PROFESOR → VOCE → TEXT → TRADUCERE → ELEV (și invers).
 * Pornește când ajunge în ecran; o etapă apăsată se oprește și se explică.
 */
export function PipelineDemo() {
  const [direction, setDirection] = useState<Direction>("prof");
  const [line, setLine] = useState(0);
  const [step, setStep] = useState(0);
  const [typed, setTyped] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [selected, setSelected] = useState<number | null>(null);
  const [visible, setVisible] = useState(false);
  const [reduced, setReduced] = useState(false);
  const rootRef = useRef<HTMLElement>(null);

  // Pornim doar când secțiunea e vizibilă; cu „reduce motion” arătăm direct starea finală.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const t = setTimeout(() => setReduced(mq.matches), 0);
    const el = rootRef.current;
    if (!el || !("IntersectionObserver" in window)) {
      const v = setTimeout(() => setVisible(true), 0);
      return () => {
        clearTimeout(t);
        clearTimeout(v);
      };
    }
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.25 });
    io.observe(el);
    return () => {
      clearTimeout(t);
      io.disconnect();
    };
  }, []);

  const script = SCRIPT[direction][line];
  const stages = STAGES[direction];
  const running = playing && visible && !reduced && selected === null;
  const typingStage = 2;

  // Cronometrul: etapă cu etapă; în etapa „Text”, literele apar progresiv.
  useEffect(() => {
    if (!running) return;
    const full = direction === "prof" ? script.source : script.output;
    if (step === typingStage && typed < full.length) {
      const t = setTimeout(() => setTyped((n) => Math.min(full.length, n + 2)), 28);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => {
      if (step < stages.length - 1) {
        setStep((s) => s + 1);
        if (step + 1 === typingStage) setTyped(0);
      } else {
        setLine((l) => (l + 1) % SCRIPT[direction].length);
        setStep(0);
        setTyped(0);
      }
    }, STEP_MS[step]);
    return () => clearTimeout(t);
  }, [running, step, typed, script, direction, stages.length]);

  const final = reduced || selected !== null;
  const shownStep = final ? stages.length - 1 : step;
  const textFull = direction === "prof" ? script.source : script.output;
  const textShown = final || step > typingStage ? textFull : step === typingStage ? textFull.slice(0, typed) : "";
  const reached = (i: number) => final || shownStep >= i;
  const isActive = (i: number) => !final && step === i;

  const switchDirection = (d: Direction) => {
    setDirection(d);
    setLine(0);
    setStep(0);
    setTyped(0);
    setSelected(null);
  };
  const restart = () => {
    setStep(0);
    setTyped(0);
    setSelected(null);
    setPlaying(true);
  };

  /** Conținutul fiecărei etape (al doilea rând din coloană). */
  const content = (i: number) => {
    const id = stages[i].id;
    const muted = "text-muted-foreground";
    if (direction === "prof") {
      if (id === "prof") return <p className="text-sm">Prof. de biologie<span className={cn("block", muted)}>Fotosinteza</span></p>;
      if (id === "voce")
        return (
          <div>
            <Wave active={isActive(i)} />
            <p className={cn("label mt-1", muted)}>{isActive(i) ? "ascult…" : script.signal}</p>
          </div>
        );
      if (id === "text")
        return (
          <p className={cn("text-sm font-medium leading-snug", isActive(i) && "caret")} aria-live="off">
            {reached(i) ? textShown || " " : <span className={muted}>—</span>}
          </p>
        );
      if (id === "trad")
        return isActive(i) ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-prof/60" />
              <span className="relative inline-flex size-2 rounded-full bg-prof" />
            </span>
            AI traduce…
          </p>
        ) : reached(i) ? (
          <p className="text-sm font-medium leading-snug" lang="en">
            <span className="label mr-1.5 rounded border border-border px-1 py-px text-[0.65rem]">EN</span>
            {script.output}
          </p>
        ) : (
          <p className={cn("text-sm", muted)}>—</p>
        );
      return reached(i) ? (
        <div className="space-y-1.5">
          <p className="text-[0.95rem] font-semibold leading-snug" lang="en">
            {script.output}
          </p>
          <p className={cn("text-xs", muted)}>{script.source}</p>
          <p className="border-t border-border pt-1.5 text-xs font-medium text-prof">{script.extra}</p>
        </div>
      ) : (
        <p className={cn("text-sm", muted)}>Așteaptă fraza</p>
      );
    }
    // Elev → profesor
    if (id === "elev") return <p className="text-sm">Andrei<span className={cn("block", muted)}>semnează în fața camerei</span></p>;
    if (id === "semn")
      return reached(i) ? (
        <div className="space-y-1.5">
          <p className="text-sm font-medium">
            <span className="label mr-1.5 rounded border border-border px-1 py-px text-[0.65rem]">{script.signal}</span>
            {script.source}
          </p>
          <div className="flex items-center gap-2">
            <span className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
              <span className="block h-full rounded-full bg-ink transition-[width] duration-500" style={{ width: `${Math.round(script.confidence * 100)}%` }} />
            </span>
            <span className="code-cells text-xs tracking-normal">{Math.round(script.confidence * 100)}%</span>
          </div>
        </div>
      ) : (
        <p className={cn("text-sm", muted)}>—</p>
      );
    if (id === "text")
      return (
        <p className={cn("text-sm font-medium leading-snug", isActive(i) && "caret")}>{reached(i) ? textShown || " " : <span className={muted}>—</span>}</p>
      );
    if (id === "voce")
      return (
        <div>
          <Wave active={isActive(i)} />
          <p className={cn("label mt-1", muted)}>{isActive(i) ? "se rostește…" : "sinteză vocală"}</p>
        </div>
      );
    return reached(i) ? (
      <div className="space-y-1.5">
        <p className="text-[0.95rem] font-semibold leading-snug">„{script.output}”</p>
        <p className="border-t border-border pt-1.5 text-xs font-medium text-prof">{script.extra}</p>
      </div>
    ) : (
      <p className={cn("text-sm", muted)}>Așteaptă semnul</p>
    );
  };

  const detailIndex = selected ?? shownStep;

  return (
    <section ref={rootRef} aria-labelledby="flux" className="reveal">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 id="flux" className="scroll-mt-24 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
            Cum circulă o frază
          </h2>
          <p className="mt-2 max-w-xl text-muted-foreground">
            Exemplu din lecția <strong className="font-semibold text-ink">Biologie · Fotosinteza</strong>. Apasă o etapă ca să vezi ce face.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div role="radiogroup" aria-label="Direcția" className="inline-flex rounded-full border border-border p-1">
            {(["prof", "elev"] as Direction[]).map((d) => (
              <button
                key={d}
                role="radio"
                aria-checked={direction === d}
                onClick={() => switchDirection(d)}
                className={cn(
                  "min-h-10 rounded-full px-4 text-sm font-semibold transition-colors",
                  direction === d ? "bg-ink text-white" : "text-muted-foreground hover:text-ink",
                )}
              >
                {d === "prof" ? "Profesor → elev" : "Elev → profesor"}
              </button>
            ))}
          </div>
          <button
            onClick={() => (selected !== null ? restart() : setPlaying((p) => !p))}
            className="inline-flex size-11 items-center justify-center rounded-full border border-border transition-colors hover:border-ink"
            aria-label={selected !== null ? "Reia demonstrația" : playing ? "Pune pauză" : "Continuă"}
          >
            {selected !== null ? <RotateCcw className="size-4" /> : playing ? <Pause className="size-4" /> : <Play className="size-4" />}
          </button>
        </div>
      </div>

      <ol className="relative grid gap-3 md:grid-cols-5 md:gap-0">
        {stages.map((s, i) => {
          const done = reached(i) && !isActive(i);
          const on = isActive(i) || selected === i;
          const Icon = s.icon;
          return (
            <li key={`${direction}-${s.id}`} className="relative md:px-1.5">
              {/* conectorul spre etapa următoare: se umple roșu când fraza a trecut */}
              {i < stages.length - 1 ? (
                <span aria-hidden className="absolute left-[1.4rem] top-11 h-[calc(100%-1.5rem)] w-px bg-border md:left-[calc(50%+1.25rem)] md:top-[1.35rem] md:h-px md:w-[calc(100%-2.5rem)]">
                  <span
                    className={cn(
                      "block size-full origin-top bg-prof transition-transform duration-500 md:origin-left",
                      reached(i + 1) ? "scale-100" : "scale-0",
                    )}
                  />
                </span>
              ) : null}
              <button
                type="button"
                onClick={() => setSelected((cur) => (cur === i ? null : i))}
                aria-pressed={selected === i}
                className={cn(
                  "group relative flex w-full items-start gap-3 rounded-lg p-1.5 text-left outline-none transition-colors md:flex-col md:items-center md:text-center",
                  "focus-visible:ring-2 focus-visible:ring-ink",
                )}
              >
                <span
                  className={cn(
                    "relative z-10 flex size-[2.6rem] shrink-0 items-center justify-center rounded-full border bg-white transition-all duration-300",
                    on ? "border-ink bg-ink text-white" : done ? "border-ink text-ink" : "border-border text-muted-foreground",
                  )}
                >
                  {done && !on ? <Check className="size-4" aria-hidden /> : <Icon className="size-4" aria-hidden />}
                  {isActive(i) ? <span aria-hidden className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full border-2 border-white bg-prof" /> : null}
                </span>
                <span className="min-w-0 flex-1 md:w-full">
                  <span className={cn("label block", on ? "text-ink" : "text-muted-foreground")}>
                    <span className="code-cells mr-1 tracking-normal">{String(i + 1).padStart(2, "0")}</span>
                    {s.label}
                  </span>
                  <span
                    className={cn(
                      "mt-2 block min-h-24 rounded-lg border bg-white p-3 text-left transition-[border-color,box-shadow] duration-300",
                      on ? "border-ink shadow-[0_10px_30px_-18px_rgba(10,10,10,0.45)]" : "border-border group-hover:border-ink/40",
                    )}
                  >
                    {content(i)}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      <div className="mt-5 flex flex-col gap-1 border-t border-border pt-4 sm:flex-row sm:items-baseline sm:gap-4" aria-live="polite">
        <p className="label shrink-0 text-prof">
          {String(detailIndex + 1).padStart(2, "0")} · {stages[detailIndex].label}
        </p>
        <p className="max-w-3xl text-[0.95rem] leading-relaxed text-ink/80">{stages[detailIndex].detail}</p>
        <p className="ml-auto shrink-0 text-xs text-muted-foreground">Exemplu, nu o lecție reală</p>
      </div>
    </section>
  );
}
