/**
 * Extragerea termenilor-cheie fără AI: cuvintele lungi, repetate, din replicile profesorului.
 * Folosită când nu există ANTHROPIC_API_KEY sau apelul AI eșuează.
 */

export interface GlossaryEntry {
  term: string;
  /** Explicație simplă, de o propoziție. */
  explanation: string;
}

const STOP = new Set(
  `acesta aceasta aceste acestea acestui acestei acolo acum adica asupra astazi astfel atunci avand avem aveti
  cateva catre ceilalti celelalte celor cineva conform contra cumva deasupra deci desigur despre dintre dintr
  dupa exemplu fiecare foarte inainte inapoi intre intotdeauna incat inseamna lectia lectie lectiei mereu
  nimeni nimic niciodata noastra nostru oricare oricum pentru pagina pagini putem puteti sfarsit spunem
  totusi trebuie vorbim vorbiti vreau vrem uitati uitam spuneti spune facem faceti aveti avea fiind
  deschideti caietele exercitiile exercitiul exercitii manual manualul pagina tema temei maine astazi
  intelegeti inteles atentie atent tabla tablei bine foarte`
    .split(/\s+/)
    .filter(Boolean),
);

function fold(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/** Rădăcina simplă, ca „clorofila” și „clorofilei” să fie același termen. */
function stem(word: string) {
  const w = fold(word);
  return w.length > 7 ? w.slice(0, w.length - 2) : w.length > 5 ? w.slice(0, w.length - 1) : w;
}

export function extractTermsLocally(
  sentences: string[],
  title: string,
  existing: GlossaryEntry[] = [],
  max = 6,
): GlossaryEntry[] {
  const counts = new Map<string, { word: string; n: number; sentence: string }>();
  const titleStems = new Set(title.split(/\s+/).map(stem));
  for (const sentence of sentences) {
    const words = sentence.match(/[\p{L}-]{6,}/gu) ?? [];
    for (const raw of words) {
      const word = raw.replace(/^-+|-+$/g, "");
      if (STOP.has(fold(word))) continue;
      const key = stem(word);
      const prev = counts.get(key);
      if (prev) prev.n++;
      else counts.set(key, { word: word.toLowerCase(), n: 1, sentence });
    }
  }
  const known = new Set(existing.map((e) => stem(e.term)));
  const ranked = [...counts.entries()]
    .filter(([key]) => !known.has(key))
    .map(([key, v]) => ({ ...v, score: v.n * 2 + (titleStems.has(key) ? 4 : 0) + v.word.length / 10 }))
    .filter((v) => v.n >= 2 || titleStems.has(stem(v.word)))
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(0, max - existing.length));
  const fresh = ranked.map((v) => ({
    term: v.word,
    explanation: v.sentence.length > 140 ? `${v.sentence.slice(0, 137)}…` : v.sentence,
  }));
  return [...existing, ...fresh].slice(0, max);
}
