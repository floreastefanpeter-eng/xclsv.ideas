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
    private minCutoff = 1.2,
    private beta = 8,
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

/** Câte un filtru pe coordonată, pentru fiecare mână (după lateralitate). */
export class HandSmoother {
  private filters = new Map<string, OneEuro[]>();

  apply<P extends Point>(hands: P[][], handedness: string[], tMs: number): P[][] {
    const t = tMs / 1000;
    const seen = new Set<string>();
    const out = hands.map((hand, i) => {
      const key = handedness[i] || `hand${i}`;
      seen.add(key);
      let f = this.filters.get(key);
      if (!f || f.length !== hand.length * 3) {
        f = Array.from({ length: hand.length * 3 }, () => new OneEuro());
        this.filters.set(key, f);
      }
      return hand.map((p, j) => ({
        ...p,
        x: f[j * 3].filter(p.x, t),
        y: f[j * 3 + 1].filter(p.y, t),
        z: f[j * 3 + 2].filter(p.z, t),
      }));
    });
    // Mâna dispărută: la revenire pornim fără istoric (altfel „alunecă” din poziția veche).
    for (const key of this.filters.keys()) if (!seen.has(key)) this.filters.delete(key);
    return out;
  }
}
