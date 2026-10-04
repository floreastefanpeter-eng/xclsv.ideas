/**
 * Semne cu mișcare (de exemplu semne LSR): fiecare semn e o secvență de poziții ale mâinilor
 * față de umeri, comparată cu exemplele înregistrate prin DTW (Dynamic Time Warping).
 * Așa se pot adăuga semne românești reale, nu doar forme statice ale mâinii.
 */

export const SEQ_LEN = 24;
const POINTS = 21;
export const SEQ_FEATURES = POINTS * 2 * 2; // 2 mâini × 21 de puncte × (x, y)

const POSE = 489;
const L_SHOULDER = POSE + 11;
const R_SHOULDER = POSE + 12;
const LEFT_HAND = 468;
const RIGHT_HAND = 522;

/** Un exemplu = SEQ_LEN cadre × SEQ_FEATURES valori. */
export type MovingExample = number[][];
export type MovingSamples = Record<string, MovingExample[]>;

/** Sub acest prag absolut (RMS, în lățimi de umeri) poate fi o potrivire. */
const ABS_THRESHOLD = 0.32;
/** Cât de mult mai departe poate fi un semn față de variația dintre propriile exemple. */
const SPREAD_FACTOR = 2.2;
/** Cât de clar trebuie să câștige față de al doilea semn (relativ). */
const MIN_MARGIN = 0.08;

const val = (f: Float32Array, i: number, axis: 0 | 1) => f[i * 2 + axis];

/** Un cadru Holistic → vector relativ la umeri (centrat între umeri, scalat cu lățimea umerilor). */
function frameFeatures(frame: Float32Array): number[] | null {
  const lx = val(frame, L_SHOULDER, 0);
  const ly = val(frame, L_SHOULDER, 1);
  const rx = val(frame, R_SHOULDER, 0);
  const ry = val(frame, R_SHOULDER, 1);
  if ([lx, ly, rx, ry].some(Number.isNaN)) return null;
  const cx = (lx + rx) / 2;
  const cy = (ly + ry) / 2;
  const scale = Math.max(Math.hypot(lx - rx, ly - ry), 1e-3);
  const out: number[] = [];
  let anyHand = false;
  for (const start of [LEFT_HAND, RIGHT_HAND]) {
    const present = !Number.isNaN(val(frame, start, 0));
    anyHand ||= present;
    for (let i = 0; i < POINTS; i++) {
      out.push(present ? (val(frame, start + i, 0) - cx) / scale : 0);
      out.push(present ? (val(frame, start + i, 1) - cy) / scale : 0);
    }
  }
  return anyHand ? out : null;
}

/** Re-eșantionare liniară la SEQ_LEN cadre. */
function resample(seq: number[][]): number[][] {
  if (seq.length === 1) return Array.from({ length: SEQ_LEN }, () => seq[0]);
  return Array.from({ length: SEQ_LEN }, (_, t) => {
    const pos = (t * (seq.length - 1)) / (SEQ_LEN - 1);
    const i = Math.floor(pos);
    const frac = pos - i;
    const a = seq[i];
    const b = seq[Math.min(i + 1, seq.length - 1)];
    return a.map((v, k) => Math.round((v + (b[k] - v) * frac) * 1000) / 1000);
  });
}

/** Cadrele unui semn (de la SignSegmenter) → exemplul normalizat, sau null dacă nu e destul. */
export function sequenceFeatures(frames: Float32Array[]): MovingExample | null {
  const seq = frames.map(frameFeatures).filter((f): f is number[] => f !== null);
  if (seq.length < 6) return null;
  return resample(seq);
}

function frameCost(a: number[], b: number[]) {
  let s = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    s += d * d;
  }
  return Math.sqrt(s / a.length);
}

/** DTW cu bandă Sakoe-Chiba; costul mediu pe drum (RMS, în lățimi de umeri). */
export function dtw(a: MovingExample, b: MovingExample, band = 6): number {
  const n = a.length;
  const m = b.length;
  const D = Array.from({ length: n + 1 }, () => new Float64Array(m + 1).fill(Infinity));
  const L = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  D[0][0] = 0;
  for (let i = 1; i <= n; i++) {
    for (let j = Math.max(1, i - band); j <= Math.min(m, i + band); j++) {
      const c = frameCost(a[i - 1], b[j - 1]);
      let best = D[i - 1][j - 1];
      let len = L[i - 1][j - 1];
      if (D[i - 1][j] < best) {
        best = D[i - 1][j];
        len = L[i - 1][j];
      }
      if (D[i][j - 1] < best) {
        best = D[i][j - 1];
        len = L[i][j - 1];
      }
      D[i][j] = best + c;
      L[i][j] = len + 1;
    }
  }
  return D[n][m] / Math.max(1, L[n][m]);
}

export interface MovingPrediction {
  label: string;
  distance: number;
  /** 0–1: cât de sigur e (din distanță și diferența față de al doilea semn). */
  confidence: number;
  /** false = „semn necunoscut”. */
  known: boolean;
}

/** Pragul de acceptare pentru un semn, din variația dintre propriile exemple. */
function thresholdFor(examples: MovingExample[]) {
  if (examples.length < 2) return ABS_THRESHOLD;
  const d: number[] = [];
  for (let i = 0; i < examples.length; i++) for (let j = i + 1; j < examples.length; j++) d.push(dtw(examples[i], examples[j]));
  const mean = d.reduce((a, b) => a + b, 0) / d.length;
  return Math.min(ABS_THRESHOLD, Math.max(0.12, mean * SPREAD_FACTOR));
}

const thresholdCache = new WeakMap<MovingExample[], number>();

export function classifyMoving(seq: MovingExample, samples: MovingSamples, allowed?: Set<string>): MovingPrediction | null {
  const perClass: { label: string; distance: number; threshold: number }[] = [];
  for (const [label, examples] of Object.entries(samples)) {
    if (!examples.length || (allowed && !allowed.has(label))) continue;
    const distances = examples.map((e) => dtw(seq, e)).sort((a, b) => a - b);
    // Media celor mai apropiate 2 exemple: mai stabil decât un singur vecin.
    const distance = distances.length > 1 ? (distances[0] + distances[1]) / 2 : distances[0];
    let threshold = thresholdCache.get(examples);
    if (threshold === undefined) {
      threshold = thresholdFor(examples);
      thresholdCache.set(examples, threshold);
    }
    perClass.push({ label, distance, threshold });
  }
  if (!perClass.length) return null;
  perClass.sort((a, b) => a.distance - b.distance);
  const [best, second] = perClass;
  const margin = second ? (second.distance - best.distance) / Math.max(best.distance, 1e-6) : 1;
  const known = best.distance <= best.threshold && margin >= MIN_MARGIN;
  const confidence = Math.max(0, Math.min(1, (1 - best.distance / (best.threshold * 1.5)) * 0.6 + Math.min(margin, 1) * 0.4));
  return { label: best.label, distance: best.distance, confidence: Math.round(confidence * 100) / 100, known };
}

export function isMovingSamples(value: unknown): value is MovingSamples {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return Object.values(value as Record<string, unknown>).every(
    (list) =>
      Array.isArray(list) &&
      list.every(
        (ex) =>
          Array.isArray(ex) &&
          ex.length === SEQ_LEN &&
          ex.every((f) => Array.isArray(f) && f.length === SEQ_FEATURES && f.every((n) => typeof n === "number")),
      ),
  );
}

export function countMoving(samples: MovingSamples) {
  return Object.values(samples).reduce((n, l) => n + l.length, 0);
}
