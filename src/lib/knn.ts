import { NONE_SIGN } from "./signs";

/** Un landmark normalizat de la MediaPipe (x, y, z în [0,1] relativ la imagine). */
export interface Landmark {
  x: number;
  y: number;
  z: number;
}

export interface HandFrame {
  landmarks: Landmark[][]; // 0–2 mâini, câte 21 de puncte
  handedness: string[]; // "Left" / "Right"
}

/** Antrenarea: pentru fiecare cuvânt din dicționar, o listă de vectori de caracteristici. */
export type Samples = Record<string, number[][]>;

export const FEATURES_PER_HAND = 63;
export const FEATURE_SIZE = FEATURES_PER_HAND * 2;

// Pragurile de recunoaștere
export const K_NEIGHBORS = 5;
export const STABLE_FRAMES = 10;
export const MIN_CONFIDENCE = 0.71;
/** Pragul de potrivire din LSR Translator: scor = 1 / (1 + distanță RMS). */
export const MIN_MATCH_SCORE = 0.45;
export const COOLDOWN_MS = 2500;

/**
 * Modelul LSR Translator: landmark-uri relative la încheietură (punctul 0),
 * scalate după distanța încheietură → baza degetului mijlociu (punctul 9).
 */
export function normalizeLandmarks(hand: Landmark[]): number[] {
  const wrist = hand[0];
  const mcp = hand[9];
  const scale = Math.max(Math.hypot(mcp.x - wrist.x, mcp.y - wrist.y), 0.00001);
  return hand.flatMap((p) => [(p.x - wrist.x) / scale, (p.y - wrist.y) / scale, (p.z - wrist.z) / scale]);
}

/**
 * Vectorul unui cadru: prima mână (ca în LSR Translator) + a doua mână, dacă există.
 * Cu două mâini, ordinea e de la stânga la dreapta în imagine, ca să fie stabilă.
 * O mână lipsă se completează cu zerouri. Returnează null dacă nu e nicio mână.
 */
export function extractFeatures(frame: HandFrame): number[] | null {
  const hands = frame.landmarks.filter((h) => h.length === 21);
  if (hands.length === 0) return null;
  const ordered = hands.length === 2 ? [...hands].sort((a, b) => a[0].x - b[0].x) : hands;
  const zeros = new Array(FEATURES_PER_HAND).fill(0);
  return [...normalizeLandmarks(ordered[0]), ...(ordered[1] ? normalizeLandmarks(ordered[1]) : zeros)];
}

/** Distanța euclidiană RMS (ca în LSR Translator). */
export function distance(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  let total = 0;
  for (let i = 0; i < n; i++) {
    const d = a[i] - b[i];
    total += d * d;
  }
  return Math.sqrt(total / n);
}

export interface Prediction {
  label: string;
  /** Ponderea voturilor k-NN pentru cuvântul câștigător (0–1). */
  confidence: number;
  /** Scorul de potrivire al celui mai apropiat exemplu (0–1). */
  match: number;
}

/**
 * Clasificator k-NN cu vot ponderat după distanță, peste distanța RMS din LSR Translator.
 * Dacă cel mai apropiat exemplu are scorul sub MIN_MATCH_SCORE, semnul e „necunoscut”.
 */
export function classify(features: number[], samples: Samples, allowed?: Set<string>, k = K_NEIGHBORS): Prediction | null {
  const neighbors: { label: string; d: number }[] = [];
  for (const [label, list] of Object.entries(samples)) {
    if (allowed && label !== NONE_SIGN && !allowed.has(label)) continue;
    for (const v of list) if (v.length === features.length) neighbors.push({ label, d: distance(features, v) });
  }
  if (neighbors.length === 0) return null;
  neighbors.sort((a, b) => a.d - b.d);
  const match = 1 / (1 + neighbors[0].d);
  const top = neighbors.slice(0, Math.min(k, neighbors.length));
  const votes = new Map<string, number>();
  let total = 0;
  for (const n of top) {
    const w = 1 / (n.d + 1e-3);
    votes.set(n.label, (votes.get(n.label) ?? 0) + w);
    total += w;
  }
  let best = top[0].label;
  let bestVotes = 0;
  for (const [label, v] of votes) {
    if (v > bestVotes) {
      best = label;
      bestVotes = v;
    }
  }
  if (match < MIN_MATCH_SCORE) return { label: NONE_SIGN, confidence: 0, match };
  return { label: best, confidence: total > 0 ? bestVotes / total : 0, match };
}

export function countSamples(samples: Samples): number {
  return Object.values(samples).reduce((n, list) => n + list.length, 0);
}

export function trainedWords(samples: Samples): string[] {
  return Object.entries(samples)
    .filter(([k, v]) => k !== NONE_SIGN && v.length > 0)
    .map(([k]) => k);
}

/**
 * Pragul de stabilitate: același semn în STABLE_FRAMES cadre consecutive,
 * cu încredere ≥ MIN_CONFIDENCE, apoi o pauză (cooldown) înainte de următorul.
 */
export class StabilityGate {
  private current: string | null = null;
  private count = 0;
  private cooldownUntil = 0;

  reset() {
    this.current = null;
    this.count = 0;
  }

  cooldown(ms = COOLDOWN_MS) {
    this.cooldownUntil = performance.now() + ms;
    this.reset();
  }

  get inCooldown() {
    return performance.now() < this.cooldownUntil;
  }

  get progress() {
    return Math.min(1, this.count / STABLE_FRAMES);
  }

  /** Returnează eticheta când devine stabilă, altfel null. */
  push(pred: Prediction | null): string | null {
    if (!pred || pred.label === NONE_SIGN || pred.confidence < MIN_CONFIDENCE) {
      this.reset();
      return null;
    }
    if (pred.label === this.current) this.count++;
    else {
      this.current = pred.label;
      this.count = 1;
    }
    if (this.inCooldown) return null;
    if (this.count >= STABLE_FRAMES) {
      const label = this.current;
      this.cooldown();
      return label;
    }
    return null;
  }
}

/**
 * Viteza gesturilor: deplasarea medie a încheieturii pe cadru (în unități de imagine).
 * Folosită pentru intonația vocii: gest rapid → voce mai alertă.
 */
export class MotionMeter {
  private last: Landmark | null = null;
  private history: number[] = [];

  push(frame: HandFrame) {
    const wrist = frame.landmarks[0]?.[0];
    if (!wrist) {
      this.last = null;
      return;
    }
    if (this.last) {
      this.history.push(Math.hypot(wrist.x - this.last.x, wrist.y - this.last.y));
      if (this.history.length > 20) this.history.shift();
    }
    this.last = wrist;
  }

  get speed() {
    if (!this.history.length) return 0;
    return this.history.reduce((a, b) => a + b, 0) / this.history.length;
  }

  prosody(): { rate: number; pitch: number } {
    const s = this.speed;
    if (s > 0.025) return { rate: 1.15, pitch: 1.12 };
    if (s < 0.006) return { rate: 0.92, pitch: 0.96 };
    return { rate: 1, pitch: 1 };
  }
}

export function isSamples(value: unknown): value is Samples {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return Object.values(value as Record<string, unknown>).every(
    (list) =>
      Array.isArray(list) &&
      list.every((v) => Array.isArray(v) && v.length === FEATURE_SIZE && v.every((n) => typeof n === "number")),
  );
}
