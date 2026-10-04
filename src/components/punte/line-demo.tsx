"use client";

import { useEffect, useState } from "react";
import { Eye, Hand, Mic, Sparkles } from "lucide-react";
import { RouteStop } from "./message-list";

const now = new Date();
const at = (min: number) => new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, min).toISOString();

/** O lecție de exemplu (date sintetice, etichetate ca atare), parcursă stație cu stație. */
const STOPS = [
  {
    key: "p1",
    line: "prof" as const,
    time: at(2),
    who: "Profesor",
    icon: <Mic className="size-4" aria-hidden />,
    text: "Clorofila este pigmentul verde din frunze.",
    translation: { text: "Chlorophyll is the green pigment in leaves.", lang: "en" },
  },
  {
    key: "t1",
    line: "system" as const,
    time: at(2),
    icon: <Sparkles className="size-4" aria-hidden />,
    text: "Termen nou: clorofilă — substanța verde care prinde lumina.",
  },
  {
    key: "e1",
    line: "elev" as const,
    time: at(3),
    who: "Andrei",
    icon: <Hand className="size-4" aria-hidden />,
    text: "Nu am înțeles.",
    alert: true,
  },
  {
    key: "s1",
    line: "system" as const,
    time: at(3),
    icon: <Eye className="size-4" aria-hidden />,
    text: "Profesorul a văzut (2 s)",
  },
  {
    key: "p2",
    line: "prof" as const,
    time: at(3),
    who: "Profesor",
    icon: <Mic className="size-4" aria-hidden />,
    text: "Clorofila prinde lumina Soarelui, ca un panou solar.",
    translation: { text: "Chlorophyll catches sunlight, like a solar panel.", lang: "en" },
  },
];

export function LineDemo() {
  const [shown, setShown] = useState(1);
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      const t = setTimeout(() => setShown(STOPS.length), 0);
      return () => clearTimeout(t);
    }
    const t = setInterval(() => setShown((n) => (n >= STOPS.length + 2 ? 1 : n + 1)), 1600);
    return () => clearInterval(t);
  }, []);

  return (
    <figure className="dark-surface rounded-xl bg-ink p-4 text-white shadow-[0_18px_40px_-18px_rgba(13,22,38,0.55)] sm:p-6">
      <figcaption className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <span className="plate text-xl">Biologie · Fotosinteza</span>
        <span className="rounded bg-white/10 px-2 py-1 text-sm font-bold text-white/80">Exemplu, nu o lecție reală</span>
      </figcaption>
      <div className="min-h-[23rem] sm:min-h-[21rem]" aria-live="off">
        {STOPS.slice(0, Math.min(shown, STOPS.length)).map(({ key, ...stop }) => (
          <RouteStop key={key} {...stop} dark animate />
        ))}
      </div>
      <p className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm font-bold text-white/75">
        <span className="inline-flex items-center gap-2">
          <span aria-hidden className="h-1 w-6 rounded-full bg-prof-line" />
          linia profesorului: voce → text, tradus
        </span>
        <span className="inline-flex items-center gap-2">
          <span aria-hidden className="h-1 w-6 rounded-full bg-elev-line" />
          linia elevului: semne → voce
        </span>
      </p>
    </figure>
  );
}
