import type { VoiceStyle } from "./types";

export const VOICE_STYLES: Record<VoiceStyle, { label: string; rate: number; pitch: number }> = {
  adolescent: { label: "Adolescent", rate: 1.05, pitch: 1.25 },
  calm: { label: "Calm", rate: 0.9, pitch: 0.95 },
  energic: { label: "Energic", rate: 1.2, pitch: 1.1 },
};

export function speechSynthesisSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function getRomanianVoices(): SpeechSynthesisVoice[] {
  if (!speechSynthesisSupported()) return [];
  return window.speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith("ro"));
}

/** Așteaptă încărcarea vocilor (Chrome le încarcă asincron). */
export function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  if (!speechSynthesisSupported()) return Promise.resolve([]);
  const synth = window.speechSynthesis;
  const now = synth.getVoices();
  if (now.length) return Promise.resolve(now);
  return new Promise((resolve) => {
    const done = () => {
      synth.removeEventListener("voiceschanged", done);
      resolve(synth.getVoices());
    };
    synth.addEventListener("voiceschanged", done);
    setTimeout(done, 1500);
  });
}

export interface SpeakOptions {
  voiceName?: string | null;
  style?: VoiceStyle;
  prosody?: { rate: number; pitch: number };
}

/** Rostește textul în română, cu stilul vocii și intonația după viteza gesturilor. */
export function speak(text: string, opts: SpeakOptions = {}) {
  if (!speechSynthesisSupported()) return;
  const synth = window.speechSynthesis;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "ro-RO";
  const voices = synth.getVoices();
  const ro = voices.filter((v) => v.lang.toLowerCase().startsWith("ro"));
  const voice = (opts.voiceName && voices.find((v) => v.name === opts.voiceName)) || ro[0];
  if (voice) u.voice = voice;
  const style = VOICE_STYLES[opts.style ?? "adolescent"];
  const p = opts.prosody ?? { rate: 1, pitch: 1 };
  u.rate = clamp(style.rate * p.rate, 0.5, 2);
  u.pitch = clamp(style.pitch * p.pitch, 0, 2);
  synth.cancel();
  synth.speak(u);
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

// ---------------------------------------------------------------
// SpeechRecognition (ro-RO)
// ---------------------------------------------------------------
export interface RecognitionResultLike {
  isFinal: boolean;
  0: { transcript: string };
}

export interface RecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<RecognitionResultLike> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

export function getRecognitionCtor(): (new () => RecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => RecognitionLike;
    webkitSpeechRecognition?: new () => RecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}
