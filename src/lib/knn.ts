import { NONE_SIGN, type TrainLabel } from "./signs";

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

/** Antrenarea: pentru fiecare etichetă, o listă de vectori de caracteristici. */
export type Samples = Partial<Record<TrainLabel, number[][]>>;

export const FEATURES_PER_HAND = 63;
export const FEATURE_SIZE = FEATURES_PER_HAND * 2;

// Pragurile de recunoaștere
export const K_NEIGHBORS = 5;
export const STABLE_FRAMES = 10;
export const MIN_CONFIDENCE = 0.71;
export const COOLDOWN_MS = 2500;

/**
 * Caracteristicile unei mâini: landmark-uri relative la încheietură,
 * scalate după distanța maximă față de încheietură (invariant la mărime și poziție).
 */
function handFeatures(points: Landmark[]): number[] {
  const wrist = points[0];
  const rel = points.map((p) => [p.x - wrist.x, p.y - wrist.y, p.z - wrist.z]);
  let scale = 0;
  for (const [x, y, z] of rel) scale = Math.max(scale, Math.hypot(x, y, z));
  if (scale < 1e-6) scale = 1;
  const out: number[] = [];
  for (const [x, y, z] of rel) out.push(x / scale, y / scale, z / scale);
  return out;
}

/**
 * Vectorul complet pentru un cadru: mâna stângă apoi mâna dreaptă (ordine stabilă).
 * O mână lipsă se completează cu zerouri. Returnează null dacă nu e nicio mână.
 */
export function extractFeatures(frame: HandFrame): number[] | null {
  if (!frame.landmarks.length) return null;
  const slots: (number[] | null)[] = [null, null];
  frame.landmarks.forEach((hand, i) => {
    if (hand.length !== 21) return;
    const side = frame.handedness[i] === "Right" ? 1 : 0;
    const idx = slots[side] ? 1 - side : side;
    slots[idx] = handFeatures(hand);
  });
  if (!slots[0] && !slots[1]) return null;
  const zeros = new Array(FEATURES_PER_HAND).fill(0);
  return [...(slots[0] ?? zeros), ...(slots[1] ?? zeros)];
}

function distance(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - (b[i] ?? 0);
    s += d * d;
  }
  return Math.sqrt(s);
}

export interface Prediction {
  label: TrainLabel;
  confidence: number;
}

/** Clasificator k-NN cu vot ponderat după distanță. */
export function classify(features: number[], samples: Samples, k = K_NEIGHBORS): Prediction | null {
  const neighbors: { label: TrainLabel; d: number }[] = [];
  for (const [label, list] of Object.entries(samples) as [TrainLabel, number[][]][]) {
    if (!list) continue;
    for (const v of list) neighbors.push({ label, d: distance(features, v) });
  }
  if (neighbors.length === 0) return null;
  neighbors.sort((a, b) => a.d - b.d);
  const top = neighbors.slice(0, Math.min(k, neighbors.length));
  const votes = new Map<TrainLabel, number>();
  let total = 0;
  for (const n of top) {
    const w = 1 / (n.d + 1e-3);
    votes.set(n.label, (votes.get(n.label) ?? 0) + w);
    total += w;
  }
  let best: TrainLabel = top[0].label;
  let bestVotes = 0;
  for (const [label, v] of votes) {
    if (v > bestVotes) {
      best = label;
      bestVotes = v;
    }
  }
  return { label: best, confidence: total > 0 ? bestVotes / total : 0 };
}

export function countSamples(samples: Samples): number {
  return Object.values(samples).reduce((n, list) => n + (list?.length ?? 0), 0);
}

export function trainedSignCount(samples: Samples): number {
  return Object.entries(samples).filter(([k, v]) => k !== NONE_SIGN && (v?.length ?? 0) > 0).length;
}

/**
 * Pragul de stabilitate: același semn în STABLE_FRAMES cadre consecutive,
 * cu încredere ≥ MIN_CONFIDENCE, apoi o pauză (cooldown) înainte de următorul.
 */
export class StabilityGate {
  private current: TrainLabel | null = null;
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
  push(pred: Prediction | null): TrainLabel | null {
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
      const d = Math.hypot(wrist.x - this.last.x, wrist.y - this.last.y);
      this.history.push(d);
      if (this.history.length > 20) this.history.shift();
    }
    this.last = wrist;
  }

  get speed() {
    if (!this.history.length) return 0;
    return this.history.reduce((a, b) => a + b, 0) / this.history.length;
  }

  /** Intonația: rate/pitch după viteza gesturilor. */
  prosody(): { rate: number; pitch: number } {
    const s = this.speed;
    if (s > 0.025) return { rate: 1.15, pitch: 1.12 }; // gesturi rapide: urgent
    if (s < 0.006) return { rate: 0.92, pitch: 0.96 }; // gesturi lente: calm
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
