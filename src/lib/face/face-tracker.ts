/**
 * Urmărirea fețelor între detecții: fiecare față primește un „track” cu poziție netezită și viteză.
 * Regula de bază: în caz de dubiu, estompăm (fail-closed).
 */

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Track extends Box {
  id: number;
  vx: number;
  vy: number;
  lastSeen: number;
  /** Fața elevului înregistrat, confirmată de face-api. */
  isStudent: boolean;
  /** Ultima verificare de identitate (ms). */
  checkedAt: number;
}

/** Cât timp ținem estomparea pe o față care nu mai e detectată (se poate întoarce sau acoperi). */
export const TRACK_TTL_MS = 900;
/** O față nouă începe doar de la acest scor; una deja urmărită se actualizează și sub el. */
export const SPAWN_MIN_SCORE = 0.6;
/** După atâta lipsă, identitatea elevului se verifică din nou. */
const REVERIFY_GAP_MS = 700;
/** O față care reapare în locul elevului, în acest interval, rămâne a elevului (mâna a trecut prin fața lui). */
const STUDENT_REAPPEAR_MS = 1200;

/** Ce parte din cutia a este acoperită de b. */
export function coveredBy(a: Box, b: Box) {
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.width, b.x + b.width);
  const y2 = Math.min(a.y + a.height, b.y + b.height);
  const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  return a.width * a.height > 0 ? inter / (a.width * a.height) : 0;
}

export function iou(a: Box, b: Box) {
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.width, b.x + b.width);
  const y2 = Math.min(a.y + a.height, b.y + b.height);
  const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  const union = a.width * a.height + b.width * b.height - inter;
  return union > 0 ? inter / union : 0;
}

function centerDistance(a: Box, b: Box) {
  const dx = a.x + a.width / 2 - (b.x + b.width / 2);
  const dy = a.y + a.height / 2 - (b.y + b.height / 2);
  return Math.hypot(dx, dy) / Math.max(1, Math.max(a.width, b.width));
}

/** Potrivirea dintre o detecție și un track: suprapunere sau centre apropiate. */
function affinity(track: Box, det: Box) {
  const o = iou(track, det);
  if (o > 0.15) return o;
  const d = centerDistance(track, det);
  return d < 0.7 ? 0.15 * (1 - d / 0.7) : 0;
}

export class FaceTracker {
  tracks: Track[] = [];
  private nextId = 1;
  /** Unde a fost văzut elevul ultima dată. */
  private lastStudent: { box: Box; at: number } | null = null;

  /** O față nouă poate fi doar o mână confundată: o ignorăm dacă e mai mult de jumătate în mână. */
  private inHand(d: Box, hands: Box[]) {
    return hands.some((h) => coveredBy(d, h) > 0.5);
  }

  /** Fața nouă apare exact unde era elevul, puțin după: e tot elevul. */
  private inheritsStudent(d: Box, now: number) {
    const ls = this.lastStudent;
    if (!ls || now - ls.at > STUDENT_REAPPEAR_MS) return false;
    const ratio = d.width / Math.max(1, ls.box.width);
    return centerDistance(ls.box, d) < 0.5 && ratio > 0.7 && ratio < 1.4;
  }

  private spawn(d: Box, now: number, checkedAt: number): Track {
    const isStudent = this.inheritsStudent(d, now);
    const t = { x: d.x, y: d.y, width: d.width, height: d.height, id: this.nextId++, vx: 0, vy: 0, lastSeen: now, isStudent, checkedAt };
    this.tracks.push(t);
    return t;
  }

  /** Detecțiile rapide (fiecare cadru). Întoarce track-urile active. */
  update(detections: (Box & { score?: number })[], now: number, hands: Box[] = []) {
    const unmatched = new Set(this.tracks.map((t) => t.id));
    const pairs: { t: Track; d: Box; score: number }[] = [];
    for (const t of this.tracks) {
      const predicted = this.predict(t, now);
      for (const d of detections) {
        const score = affinity(predicted, d);
        if (score > 0) pairs.push({ t, d, score });
      }
    }
    pairs.sort((a, b) => b.score - a.score);
    const usedDet = new Set<Box>();
    for (const { t, d } of pairs) {
      if (!unmatched.has(t.id) || usedDet.has(d)) continue;
      unmatched.delete(t.id);
      usedDet.add(d);
      const dt = Math.max(1, now - t.lastSeen);
      // Fața a lipsit o vreme: altcineva poate fi acum în locul ei. Re-verificăm identitatea.
      if (dt > REVERIFY_GAP_MS) t.isStudent = false;
      const cx = d.x + d.width / 2;
      const cy = d.y + d.height / 2;
      const pcx = t.x + t.width / 2;
      const pcy = t.y + t.height / 2;
      t.vx = 0.6 * t.vx + 0.4 * ((cx - pcx) / dt);
      t.vy = 0.6 * t.vy + 0.4 * ((cy - pcy) / dt);
      // Poziția urmează repede detecția; mărimea se netezește mai mult (detecțiile pulsează).
      const k = 0.7;
      const w = t.width + (d.width - t.width) * 0.5;
      const h = t.height + (d.height - t.height) * 0.5;
      const ncx = pcx + (cx - pcx) * k;
      const ncy = pcy + (cy - pcy) * k;
      t.x = ncx - w / 2;
      t.y = ncy - h / 2;
      t.width = w;
      t.height = h;
      t.lastSeen = now;
      if (t.isStudent) this.lastStudent = { box: { x: t.x, y: t.y, width: t.width, height: t.height }, at: now };
    }
    for (const d of detections) {
      if (usedDet.has(d)) continue;
      if ((d.score ?? 1) < SPAWN_MIN_SCORE || this.inHand(d, hands)) continue;
      this.spawn(d, now, 0);
    }
    this.tracks = this.tracks.filter((t) => now - t.lastSeen < TRACK_TTL_MS);
    return this.tracks;
  }

  /** Poziția estimată acum: mișcarea continuă cu viteza ultimă (plafonată). */
  predict(t: Track, now: number): Box {
    const dt = Math.min(250, now - t.lastSeen);
    return { x: t.x + t.vx * dt, y: t.y + t.vy * dt, width: t.width, height: t.height };
  }

  /**
   * Rezultatele face-api (mai lente, cu identitate). Dacă o față nu are track (de ex. e departe
   * și BlazeFace n-a văzut-o), o adăugăm, ca să fie estompată.
   */
  applyIdentity(results: (Box & { distance: number | null })[], threshold: number, now: number, hands: Box[] = []) {
    let bestTrack: Track | null = null;
    let bestDistance = Infinity;
    for (const r of results) {
      let match: Track | null = null;
      let score = 0;
      for (const t of this.tracks) {
        const s = affinity(this.predict(t, now), r);
        if (s > score) {
          score = s;
          match = t;
        }
      }
      if (!match) {
        // Elevul confirmat de face-api nu are nevoie de verificarea mâinii; un necunoscut, da.
        const known = r.distance !== null && r.distance < threshold;
        if (!known && this.inHand(r, hands)) continue;
        match = this.spawn(r, now, now);
      }
      match.checkedAt = now;
      // Histerezis: elevul rămâne elev până la o distanță clar mai mare.
      if (r.distance === null || r.distance > threshold + (match.isStudent ? 0.08 : 0)) match.isStudent = false;
      else if (r.distance < bestDistance) {
        bestDistance = r.distance;
        bestTrack = match;
      }
    }
    // Un singur elev: cea mai apropiată potrivire.
    for (const t of this.tracks) if (t !== bestTrack && t.checkedAt === now) t.isStudent = false;
    if (bestTrack) {
      bestTrack.isStudent = true;
      this.lastStudent = { box: { x: bestTrack.x, y: bestTrack.y, width: bestTrack.width, height: bestTrack.height }, at: now };
    }
  }

  reset() {
    this.tracks = [];
    this.lastStudent = null;
  }
}
