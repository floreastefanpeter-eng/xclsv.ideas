/**
 * Preprocesarea pentru modelul ASL Realtime Transformer.
 * Port TypeScript al app/web/preprocess.js din github.com/ceydaakin/asl-realtime (licență MIT).
 *
 * Un cadru este un Float32Array cu 543 × 2 valori (x, y pentru fiecare landmark Holistic),
 * NaN = nedetectat. Ordinea Holistic: față (468), mâna stângă (21), corp (33), mâna dreaptă (21).
 */

export const INPUT_SIZE = 64;
export const N_COLS = 66;
const N_HOLISTIC = 543;

type Point = { x: number; y: number };

export interface HolisticLike {
  faceLandmarks?: Point[][];
  leftHandLandmarks?: Point[][];
  poseLandmarks?: Point[][];
  rightHandLandmarks?: Point[][];
}

const range = (start: number, stop: number) => Array.from({ length: stop - start }, (_, i) => start + i);

const LIPS = [
  61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291, 146, 91, 181, 84, 17, 314, 405, 321, 375, 78, 191, 80, 81, 82, 13,
  312, 311, 310, 415, 95, 88, 178, 87, 14, 317, 402, 318, 324, 308,
];
const LEFT_HAND = range(468, 489);
const RIGHT_HAND = range(522, 543);
const LEFT_DOMINANT = [...LIPS, ...LEFT_HAND, 502, 504, 506, 508, 510];
const RIGHT_DOMINANT = [...LIPS, ...RIGHT_HAND, 503, 505, 507, 509, 511];
const PARTS: [keyof HolisticLike, number, number][] = [
  ["faceLandmarks", 0, 468],
  ["leftHandLandmarks", 468, 21],
  ["poseLandmarks", 489, 33],
  ["rightHandLandmarks", 522, 21],
];

const detected = (frame: Float32Array, idxs: number[]) => idxs.some((i) => !Number.isNaN(frame[i * 2]));

export function hasHand(frame: Float32Array) {
  return detected(frame, LEFT_HAND) || detected(frame, RIGHT_HAND);
}

/** HolisticLandmarkerResult → cadru. */
export function holisticFrame(result: HolisticLike): Float32Array {
  const frame = new Float32Array(N_HOLISTIC * 2).fill(NaN);
  for (const [field, start, count] of PARTS) {
    const points = result[field]?.[0];
    if (!points?.length) continue;
    for (let i = 0; i < count && i < points.length; i++) {
      frame[(start + i) * 2] = points[i].x;
      frame[(start + i) * 2 + 1] = points[i].y;
    }
  }
  return frame;
}

/** np.array_split: primele (n % parts) bucăți au cu un element în plus. */
function chunks(n: number, parts: number): [number, number][] {
  const base = Math.floor(n / parts);
  const extra = n % parts;
  let start = 0;
  return range(0, parts).map((i) => {
    const size = base + (i < extra ? 1 : 0);
    start += size;
    return [start - size, start];
  });
}

export interface AslWindow {
  xy: Float32Array; // INPUT_SIZE × N_COLS × 2
  mask: Float32Array; // INPUT_SIZE
  length: number;
}

/** cadre → fereastra de intrare a modelului (mâna dominantă, buzele, brațul). */
export function toWindow(frames: Float32Array[]): AslWindow {
  const left = frames.filter((f) => detected(f, LEFT_HAND));
  const right = frames.filter((f) => detected(f, RIGHT_HAND));
  const leftDominant = left.length >= right.length;
  const idxs = leftDominant ? LEFT_DOMINANT : RIGHT_DOMINANT;
  const clip = (leftDominant ? left : right).map((frame) => {
    const out = new Float32Array(N_COLS * 2);
    idxs.forEach((src, col) => {
      const x = frame[src * 2];
      // Clipurile cu mâna dreaptă dominantă se oglindesc: mâna și brațul, nu buzele.
      out[col * 2] = leftDominant || col < LIPS.length ? x : 1 - x;
      out[col * 2 + 1] = frame[src * 2 + 1];
    });
    return out;
  });

  const spans: [number, number][] =
    clip.length > INPUT_SIZE ? chunks(clip.length, INPUT_SIZE) : clip.map((_, i) => [i, i + 1]);
  const xy = new Float32Array(INPUT_SIZE * N_COLS * 2);
  spans.forEach(([start, stop], t) => {
    for (let v = 0; v < N_COLS * 2; v++) {
      let sum = 0;
      let count = 0;
      for (let i = start; i < stop; i++) {
        if (!Number.isNaN(clip[i][v])) {
          sum += clip[i][v];
          count++;
        }
      }
      xy[t * N_COLS * 2 + v] = count ? sum / count : 0;
    }
  });
  const mask = new Float32Array(INPUT_SIZE);
  mask.fill(1, 0, spans.length);
  return { xy, mask, length: spans.length };
}

/** Un semn = o serie de cadre cu o mână în cadru; push() îl returnează când mâna dispare. */
export class SignSegmenter {
  private frames: Float32Array[] = [];
  private handFrames = 0;
  private missing = 0;

  constructor(
    private gap = 8,
    private minFrames = 4,
    private maxFrames = 4 * INPUT_SIZE,
  ) {}

  reset() {
    this.frames = [];
    this.handFrames = 0;
    this.missing = 0;
  }

  /** Câte cadre are semnul în curs (0 = niciun semn). */
  get active() {
    return this.handFrames;
  }

  push(frame: Float32Array): Float32Array[] | null {
    const hand = hasHand(frame);
    if (!hand && !this.frames.length) return null;
    this.frames.push(frame);
    this.handFrames += hand ? 1 : 0;
    this.missing = hand ? 0 : this.missing + 1;
    if (this.missing < this.gap && this.frames.length < this.maxFrames) return null;
    const { frames, handFrames } = this;
    this.reset();
    return handFrames >= this.minFrames ? frames : null;
  }
}
