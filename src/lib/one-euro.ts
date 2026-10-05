/**
 * Filtrul One Euro (Casiez, Roussel, Vogel — CHI 2012): netezește tremurul landmark-urilor
 * când mâna stă pe loc, fără întârziere când se mișcă repede. Standardul în hand tracking.
 */

class LowPass {
  private y: number | null = null;
  filter(x: number, alpha: number) {
    this.y = this.y === null ? x : alpha * x + (1 - alpha) * this.y;
    return this.y;
  }
  get last() {
    return this.y;
  }
  reset() {
    this.y = null;
  }
}

function alphaFor(cutoff: number, dt: number) {
  const tau = 1 / (2 * Math.PI * cutoff);
  return 1 / (1 + tau / dt);
}

export class OneEuro {
  private x = new LowPass();
  private dx = new LowPass();
  private lastT: number | null = null;

  constructor(
    // Mai mică = mai neted când mâna stă pe loc; beta mai mare = mai rapid când se mișcă.
    private minCutoff = 0.9,
    private beta = 12,
    private dCutoff = 1,
  ) {}

  filter(value: number, tSec: number) {
    const dt = this.lastT === null ? 1 / 30 : Math.max(1e-3, tSec - this.lastT);
    this.lastT = tSec;
    const prev = this.x.last;
    const derivative = prev === null ? 0 : (value - prev) / dt;
    const edx = this.dx.filter(derivative, alphaFor(this.dCutoff, dt));
    const cutoff = this.minCutoff + this.beta * Math.abs(edx);
    return this.x.filter(value, alphaFor(cutoff, dt));
  }

  reset() {
    this.x.reset();
    this.dx.reset();
    this.lastT = null;
  }
}

type Point = { x: number; y: number; z: number };

/** Cât timp „ținem” o mână care a dispărut (mișcare prea rapidă, blur): apoi o lăsăm să dispară. */
const HOLD_MS = 260;
/** Cât de departe o împingem cu viteza ei (ca să nu „zboare” din cadru). */
const PREDICT_MS = 90;

interface HandState {
  filters: OneEuro[];
  last: Point[];
  /** Viteza fiecărui punct (unități pe ms), din ultimele două cadre. */
  velocity: { x: number; y: number }[];
  seenAt: number;
}

/**
 * Netezirea mâinilor + continuitate: fiecare mână (după lateralitate) are filtrele ei.
 * Dacă o mână lipsește câteva cadre (mișcare rapidă), o păstrăm unde o duce viteza ei,
 * marcată `held`; când reapare, filtrul continuă de unde a rămas, fără salt.
 */
export class HandSmoother {
  private hands = new Map<string, HandState>();

  apply<P extends Point>(hands: P[][], handedness: string[], tMs: number): { hands: P[][]; handedness: string[]; held: boolean[] } {
    const t = tMs / 1000;
    const seen = new Set<string>();
    const outHands: P[][] = [];
    const outKeys: string[] = [];
    const held: boolean[] = [];

    hands.forEach((hand, i) => {
      const key = handedness[i] || `hand${i}`;
      seen.add(key);
      let st = this.hands.get(key);
      if (!st || st.filters.length !== hand.length * 3) {
        st = {
          filters: Array.from({ length: hand.length * 3 }, () => new OneEuro()),
          last: [],
          velocity: hand.map(() => ({ x: 0, y: 0 })),
          seenAt: tMs,
        };
        this.hands.set(key, st);
      }
      const f = st.filters;
      const smoothed = hand.map((p, j) => ({
        ...p,
        x: f[j * 3].filter(p.x, t),
        y: f[j * 3 + 1].filter(p.y, t),
        z: f[j * 3 + 2].filter(p.z, t),
      }));
      const dt = Math.max(1, tMs - st.seenAt);
      if (st.last.length === smoothed.length) {
        st.velocity = smoothed.map((p, j) => ({
          x: 0.6 * st!.velocity[j].x + 0.4 * ((p.x - st!.last[j].x) / dt),
          y: 0.6 * st!.velocity[j].y + 0.4 * ((p.y - st!.last[j].y) / dt),
        }));
      }
      st.last = smoothed;
      st.seenAt = tMs;
      outHands.push(smoothed);
      outKeys.push(key);
      held.push(false);
    });

    // Mâinile care lipsesc de foarte puțin: le ținem (prezise), apoi le uităm.
    for (const [key, st] of this.hands) {
      if (seen.has(key)) continue;
      const gap = tMs - st.seenAt;
      if (gap > HOLD_MS || !st.last.length) {
        this.hands.delete(key);
        continue;
      }
      const ahead = Math.min(gap, PREDICT_MS);
      outHands.push(
        st.last.map((p, j) => ({ ...p, x: p.x + st.velocity[j].x * ahead, y: p.y + st.velocity[j].y * ahead })) as P[],
      );
      outKeys.push(key);
      held.push(true);
    }
    return { hands: outHands, handedness: outKeys, held };
  }
}
