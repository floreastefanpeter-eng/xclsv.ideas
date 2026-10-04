"use client";

import { useEffect, useMemo, useState } from "react";
import { AArrowDown, AArrowUp, Eye, Maximize, Mic, Minimize } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BuzzBanner, vibrate } from "@/components/punte/buzz-banner";
import { GlossaryPanel } from "@/components/punte/glossary-panel";
import { LanguageSelect } from "@/components/punte/language-select";
import { LessonMemory } from "@/components/punte/lesson-memory";
import { LineMap } from "@/components/punte/line-map";
import { ErrorScreen, LoadingScreen } from "@/components/punte/screen-state";
import { StationBand } from "@/components/punte/station-band";
import { useLesson } from "@/hooks/use-lesson";
import { useTranslations } from "@/hooks/use-translations";
import { isLanguage, isRtl } from "@/lib/languages";
import { SEMAFOR_META } from "@/lib/signs";
import type { BuzzKind, SemaforState } from "@/lib/types";
import { cn } from "@/lib/utils";

const LANG_KEY = "punte-desk-lang";
const SIZE_KEY = "punte-desk-size";
const SIZES = [
  { now: "text-3xl sm:text-4xl", before: "text-xl sm:text-2xl" },
  { now: "text-4xl sm:text-5xl", before: "text-2xl sm:text-3xl" },
  { now: "text-5xl sm:text-6xl", before: "text-2xl sm:text-3xl" },
  { now: "text-6xl sm:text-7xl", before: "text-3xl sm:text-4xl" },
];

function readLocal<T>(key: string, parse: (v: string | null) => T): T {
  try {
    return parse(localStorage.getItem(key));
  } catch {
    return parse(null);
  }
}
function writeLocal(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // stocarea locală indisponibilă
  }
}

/** Ecranul nu se stinge cât timp e deschisă lecția (tableta stă pe masă, neatinsă). */
function useWakeLock() {
  useEffect(() => {
    let lock: { release: () => Promise<void> } | null = null;
    const request = async () => {
      try {
        const wl = (navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } }).wakeLock;
        if (document.visibilityState === "visible" && wl) lock = await wl.request("screen");
      } catch {
        // refuzat (baterie slabă) sau nesuportat: ecranul se poate stinge
      }
    };
    void request();
    document.addEventListener("visibilitychange", request);
    return () => {
      document.removeEventListener("visibilitychange", request);
      void lock?.release().catch(() => undefined);
    };
  }, []);
}

/** Linia profesorului în dreptul fiecărei fraze: stația curentă e plină, cele trecute estompate. */
function DeskRail({ latest, live }: { latest?: boolean; live?: boolean }) {
  return (
    <span aria-hidden className="relative flex justify-center">
      <span className={cn("absolute inset-y-0 w-1.5", live ? "rail-dashed" : latest ? "bg-prof-line" : "bg-white/20")} />
      <span
        className={cn(
          "relative z-10 mt-3 size-6 rounded-full border-[5px] sm:mt-4",
          live ? "live-dot border-prof-line bg-night" : latest ? "border-prof-line bg-white" : "border-white/30 bg-night",
        )}
      />
    </span>
  );
}

/**
 * Masa elevului: tableta sau telefonul de pe bancă. Arată, foarte mare și în timp real, ce spune
 * profesorul — tradus în limba aleasă — plus termenii lecției și alertele. Doar afișare, fără cont.
 */
export default function DeskScreen({ code }: { code: string }) {
  const api = useLesson(code, "desk");
  const { lesson, messages, summary, on, connection, connected } = api;
  const [interim, setInterim] = useState("");
  const [semafor, setSemafor] = useState<SemaforState>("neutru");
  const [buzz, setBuzz] = useState<{ kind: BuzzKind; text?: string; id: number } | null>(null);
  const [seen, setSeen] = useState(false);
  const [lang, setLangState] = useState<string>(() => readLocal(LANG_KEY, (v) => (isLanguage(v) ? v : "ro")));
  const [size, setSizeState] = useState(() => readLocal(SIZE_KEY, (v) => Math.min(3, Math.max(0, Number(v ?? 1) || 1))));
  const [fullscreen, setFullscreen] = useState(false);
  useWakeLock();

  const setLang = (v: string) => {
    setLangState(v);
    writeLocal(LANG_KEY, v);
  };
  const setSize = (v: number) => {
    const next = Math.min(3, Math.max(0, v));
    setSizeState(next);
    writeLocal(SIZE_KEY, String(next));
  };

  useEffect(() => {
    let buzzTimer: ReturnType<typeof setTimeout> | undefined;
    let seenTimer: ReturnType<typeof setTimeout> | undefined;
    const offs = [
      on("caption_interim", ({ text }) => setInterim(text)),
      on("semafor", ({ state }) => setSemafor(state)),
      on("buzz", ({ kind, text }) => {
        vibrate(kind);
        setBuzz({ kind, text, id: Date.now() });
        clearTimeout(buzzTimer);
        buzzTimer = setTimeout(() => setBuzz(null), 5000);
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

  const { onMessage } = api;
  useEffect(
    () =>
      onMessage((m) => {
        if (m.sender_role === "teacher") setInterim("");
      }),
    [onMessage],
  );

  useEffect(() => {
    const update = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", update);
    return () => document.removeEventListener("fullscreenchange", update);
  }, []);

  const teacherLines = useMemo(
    () => messages.filter((m) => m.sender_role === "teacher" && m.kind !== "system").slice(-6),
    [messages],
  );
  const items = useMemo(() => teacherLines.map((m) => ({ id: m.id, text: m.text })), [teacherLines]);
  const { translations, status } = useTranslations(items, lang);
  const lastStudent = useMemo(() => [...messages].reverse().find((m) => m.sender_role === "student" && m.kind === "sign"), [messages]);

  if (api.error) return <ErrorScreen message={api.error} dark />;
  if (!lesson) return <LoadingScreen dark />;

  const ended = lesson.status === "ended" || !!summary;
  const translating = lang !== "ro";
  const rtl = isRtl(lang);
  const sz = SIZES[size];

  return (
    <div className="dark-surface flex min-h-dvh flex-1 flex-col bg-night text-white">
      <BuzzBanner buzz={buzz} />
      <StationBand logoHref={`/j/${lesson.code}`} sticky={false}>
        <div className="flex min-w-0 items-center gap-4">
          <p className="hidden min-w-0 truncate text-lg font-bold md:block">
            {lesson.subject} · {lesson.title}
          </p>
          <LineMap
            dark
            connection={connection}
            className="ml-auto w-full max-w-xs"
            stations={[
              { key: "t", label: "Profesor", line: "prof", on: connected.teacher },
              { key: "s", label: lesson.student_name, line: "elev", on: connected.student },
              { key: "d", label: "Masa", line: "elev", on: true, here: true },
            ]}
          />
        </div>
      </StationBand>

      {/* bara de control: limbă, mărimea textului, ecran complet */}
      <div className="border-b border-white/10 bg-ink-2">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-end gap-3 px-4 py-3 sm:px-6">
          <LanguageSelect id="desk-lang" dark value={lang} onChange={setLang} className="min-w-0 flex-1 basis-52 sm:max-w-xs sm:flex-none sm:basis-72" />
          <div className="flex items-center gap-1" role="group" aria-label="Mărimea textului">
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 hover:text-white" onClick={() => setSize(size - 1)} disabled={size === 0} aria-label="Text mai mic">
              <AArrowDown aria-hidden />
            </Button>
            <span className="w-10 text-center text-sm font-bold tabular text-white/70" aria-live="polite">
              {size + 1}/4
            </span>
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 hover:text-white" onClick={() => setSize(size + 1)} disabled={size === 3} aria-label="Text mai mare">
              <AArrowUp aria-hidden />
            </Button>
          </div>
          <Button
            variant="ghost"
            className="text-white hover:bg-white/10 hover:text-white"
            onClick={() => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()).catch(() => undefined)}
          >
            {fullscreen ? <Minimize aria-hidden /> : <Maximize aria-hidden />}
            <span className="hidden sm:inline">{fullscreen ? "Ieși din ecran complet" : "Ecran complet"}</span>
          </Button>
          <span className="flex w-full items-center gap-2 text-sm font-bold text-white/70 sm:ml-auto sm:w-auto">
            <span aria-hidden className="led size-3 rounded-full" style={{ ["--led" as string]: SEMAFOR_META[semafor].color }} />
            {lesson.student_name}: {SEMAFOR_META[semafor].label}
          </span>
        </div>
      </div>

      <main className="mx-auto grid w-full max-w-7xl flex-1 gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <section aria-label="Ce spune profesorul" className="flex min-h-[55dvh] flex-col">
          <div className="flex flex-1 flex-col justify-end" role="log" aria-live="polite" dir={rtl ? "rtl" : undefined}>
            {teacherLines.length === 0 && !interim ? (
              <p className="m-auto max-w-lg text-center text-2xl text-white/60">
                Când profesorul vorbește, cuvintele lui apar aici, mari, {translating ? "traduse în limba ta" : "în timp real"}.
              </p>
            ) : null}
            {teacherLines.map((m, i) => {
              const latest = i === teacherLines.length - 1 && !interim;
              const tr = translating ? translations.get(m.id) : undefined;
              return (
                <article
                  key={m.id}
                  className={cn(
                    "stop-in grid grid-cols-[1.75rem_minmax(0,1fr)] gap-x-3 transition-opacity duration-500 sm:gap-x-4",
                    // Pe telefon: doar ultimele 3 fraze, ca fraza curentă să rămână pe ecran.
                    i < teacherLines.length - 3 && "max-sm:hidden",
                  )}
                >
                  <DeskRail latest={latest} />
                  <div className="min-w-0 pb-5">
                  <p lang={tr ? lang : "ro"} className={cn("font-display font-extrabold leading-[1.08]", latest ? sz.now : cn(sz.before, "text-white/80"))}>
                    {tr ?? m.text}
                  </p>
                  {translating ? (
                    <p lang="ro" dir="ltr" className={cn("mt-1.5", latest ? "text-xl text-white/70 sm:text-2xl" : "text-lg text-white/65")}>
                      {tr ? m.text : status === "error" ? `${m.text} · traducerea nu e disponibilă acum` : `${m.text} · se traduce…`}
                    </p>
                  ) : null}
                  </div>
                </article>
              );
            })}
            {interim ? (
              <article className="grid grid-cols-[1.75rem_minmax(0,1fr)] gap-x-3 sm:gap-x-4" aria-label="Profesorul vorbește acum">
                <DeskRail live />
                <div className="min-w-0 pb-2">
                <p className="mb-1 flex items-center gap-2 text-base font-bold text-prof-line">
                  <Mic className="live-dot size-5" aria-hidden />
                  Profesorul vorbește…
                </p>
                <p lang="ro" dir="ltr" className={cn("font-display font-extrabold leading-[1.08] text-white/85", sz.now)}>
                  {interim}
                </p>
                </div>
              </article>
            ) : null}
          </div>
          {lastStudent || seen ? (
            <p className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-elev/25 px-4 py-3 text-lg font-bold" role="status">
              {seen ? (
                <span className="inline-flex items-center gap-2 text-white">
                  <Eye className="size-5 text-sem-inteles" aria-hidden />
                  Profesorul a văzut
                </span>
              ) : null}
              {lastStudent ? <span className="text-white/80">Ultimul tău semn: „{lastStudent.text}”</span> : null}
            </p>
          ) : null}
        </section>

        <aside className="flex flex-col gap-5">
          <GlossaryPanel lesson={lesson} lang={lang} dark large />
        </aside>
      </main>

      {ended && summary ? (
        <div className="mx-auto w-full max-w-7xl px-4 pb-10 sm:px-6">
          <LessonMemory summary={summary} title={lesson.title} dark large lang={lang} />
        </div>
      ) : null}
    </div>
  );
}
