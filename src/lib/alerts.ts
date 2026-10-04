import type { BuzzKind } from "./types";

function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

/**
 * Detectează alertele pentru elev din fraza profesorului:
 * numele elevului → nume; „temă / test / mâine” → tema; întrebare → intrebare.
 * Ordinea contează: o singură vibrație per frază, cea mai importantă.
 */
export function detectBuzz(text: string, studentName: string): BuzzKind | null {
  const t = normalize(text);
  const name = normalize(studentName.trim());
  if (name && new RegExp(`\\b${escapeRegExp(name)}\\b`).test(t)) return "nume";
  if (/\b(tema|teme|temei|test|testul|maine)\b/.test(t)) return "tema";
  if (text.trim().endsWith("?") || /^(cine|ce|cum|unde|cand|de ce|care|cat|ati inteles|ai inteles)\b/.test(t)) {
    return "intrebare";
  }
  return null;
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Recunoașterea vocală nu pune semne de întrebare: le adăugăm pentru întrebările evidente. */
export function punctuate(text: string): string {
  let t = text.trim();
  if (!t) return t;
  t = t[0].toUpperCase() + t.slice(1);
  if (/[.!?…]$/.test(t)) return t;
  const n = normalize(t);
  if (/^(cine|ce|cum|unde|cand|de ce|care|cat|cate|oare|ati inteles|ai inteles|intelegeti|stie cineva)\b/.test(n)) {
    return t + "?";
  }
  return t + ".";
}
