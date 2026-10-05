import type { BuzzKind, SemaforState } from "./types";

export const NONE_SIGN = "fara_semn";

export type SignCategory = "clasa" | "lsr" | "personal" | "asl";

/** Un cuvânt din dicționarul de semne. */
export interface SignDef {
  id: string;
  /** Cuvântul, așa cum apare în dicționar (de exemplu „AJUTOR”). */
  word: string;
  /** Fraza rostită și afișată profesorului. */
  phrase: string;
  /** Starea semaforului după semn; null = nu schimbă semaforul. */
  state: SemaforState | null;
  /** Aprinde insigna profesorului. */
  alert: boolean;
  category: SignCategory;
  hint?: string;
  /** Tasta de rezervă (1–9). */
  key?: string;
}

/** Dicționarul de bază: semnele clasei + cuvintele din LSR Translator. */
export const BASE_DICTIONARY: SignDef[] = [
  // Semnele clasei
  {
    id: "nu_inteles",
    word: "NU ÎNȚELEG",
    phrase: "Nu am înțeles.",
    state: "neinteles",
    alert: true,
    category: "clasa",
    key: "1",
    hint: "De exemplu: palma deschisă, degetele lipite, în fața pieptului.",
  },
  {
    id: "repetati",
    word: "REPETAȚI",
    phrase: "Puteți repeta, vă rog?",
    state: "neinteles",
    alert: true,
    category: "clasa",
    key: "2",
    hint: "De exemplu: degetul arătător ridicat.",
  },
  {
    id: "intrebare",
    word: "ÎNTREBARE",
    phrase: "Am o întrebare.",
    state: "intrebare",
    alert: true,
    category: "clasa",
    key: "3",
    hint: "De exemplu: mâna ridicată, palma spre cameră.",
  },
  {
    id: "termen",
    word: "TERMEN",
    phrase: "Ce înseamnă termenul lecției?",
    state: "intrebare",
    alert: true,
    category: "clasa",
    key: "4",
    hint: "De exemplu: degetul mare și arătătorul formând litera „C”.",
  },
  {
    id: "terminat",
    word: "AM TERMINAT",
    phrase: "Am terminat exercițiul.",
    state: "inteles",
    alert: false,
    category: "clasa",
    key: "5",
    hint: "De exemplu: degetul mare ridicat.",
  },
  {
    id: "multumesc",
    word: "MULȚUMESC",
    phrase: "Mulțumesc!",
    state: "inteles",
    alert: false,
    category: "clasa",
    key: "6",
    hint: "Vârful degetelor la bărbie, apoi mâna spre înainte.",
  },
  // Cuvintele din LSR Translator
  { id: "buna", word: "BUNĂ", phrase: "Bună!", state: null, alert: false, category: "lsr", key: "7" },
  { id: "da", word: "DA", phrase: "Da.", state: "inteles", alert: false, category: "lsr", key: "8" },
  { id: "nu", word: "NU", phrase: "Nu.", state: null, alert: false, category: "lsr", key: "9" },
  { id: "ajutor", word: "AJUTOR", phrase: "Am nevoie de ajutor!", state: "neinteles", alert: true, category: "lsr" },
  { id: "apa", word: "APĂ", phrase: "Apă.", state: null, alert: false, category: "lsr" },
  { id: "casa", word: "CASĂ", phrase: "Casă.", state: null, alert: false, category: "lsr" },
  { id: "prieten", word: "PRIETEN", phrase: "Prieten.", state: null, alert: false, category: "lsr" },
  { id: "familie", word: "FAMILIE", phrase: "Familie.", state: null, alert: false, category: "lsr" },
  { id: "te_iubesc", word: "TE IUBESC", phrase: "Te iubesc!", state: null, alert: false, category: "lsr" },
];

export const CATEGORY_LABELS: Record<SignCategory, string> = {
  clasa: "Semnele clasei",
  lsr: "Cuvinte LSR",
  personal: "Cuvintele mele",
  asl: "Model ASL (open source)",
};

export const NONE_DEF = {
  id: NONE_SIGN,
  word: "FĂRĂ SEMN",
  hint: "Mâinile în repaus sau gesturi obișnuite, ca să nu fie confundate cu semne.",
};

/** Un cuvânt adăugat de elev în dicționar. */
export interface CustomWord {
  id: string;
  word: string;
  phrase?: string;
  /** Cum se face semnul (apare pe cardul cuvântului). */
  hint?: string;
}

export function customToSign(c: CustomWord): SignDef {
  return {
    id: c.id,
    word: c.word.toUpperCase(),
    phrase: c.phrase?.trim() || capitalizeSentence(c.word),
    state: null,
    alert: false,
    category: "personal",
    hint: c.hint?.trim() || undefined,
  };
}

export function buildDictionary(custom: CustomWord[]): SignDef[] {
  return [...BASE_DICTIONARY, ...custom.map(customToSign)];
}

export function findSign(dictionary: SignDef[], id: string): SignDef | undefined {
  return dictionary.find((s) => s.id === id);
}

export function signByKey(dictionary: SignDef[], key: string): SignDef | undefined {
  return dictionary.find((s) => s.key === key);
}

export function slugify(word: string): string {
  return (
    "w_" +
    word
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "")
  );
}

function capitalizeSentence(word: string) {
  const w = word.trim().toLowerCase();
  return w ? w[0].toUpperCase() + w.slice(1) + "." : w;
}

/** Forma articulată simplă pentru termeni: „clorofilă” → „clorofila”. */
export function articulate(term: string): string {
  const [first, ...rest] = term.trim().split(/\s+/);
  if (!first) return term;
  const lower = first.toLowerCase();
  let word = first;
  if (lower.endsWith("ă")) word = first.slice(0, -1) + "a";
  else if (lower.endsWith("ie")) word = first.slice(0, -1) + "a";
  else if (lower.endsWith("e")) word = first + "a";
  else if (/[bcdfghjklmnpqrstvwxzșț]$/.test(lower)) word = first + "ul";
  return [word, ...rest].join(" ");
}

/** Fraza pentru un semn; „TERMEN” folosește termenul principal al lecției. */
export function phraseFor(sign: SignDef, terms: string[]): { text: string; fromDictionary: boolean } {
  if (sign.id === "termen" && terms.length > 0) {
    return { text: `Ce este ${articulate(terms[0])}?`, fromDictionary: true };
  }
  return { text: sign.phrase, fromDictionary: false };
}

export const SEMAFOR_META: Record<SemaforState, { label: string; color: string; short: string }> = {
  neutru: { label: "În așteptare", color: "#8A8A8A", short: "Neutru" },
  semneaza: { label: "Semnează…", color: "#1747C4", short: "Semnează" },
  intrebare: { label: "Vrea să intervină", color: "#F2A100", short: "Întrebare" },
  inteles: { label: "A înțeles", color: "#13803F", short: "A înțeles" },
  neinteles: { label: "Nu a înțeles", color: "#D7262B", short: "Nu a înțeles" },
};

export const BUZZ_META: Record<BuzzKind, { label: string; pattern: number[] }> = {
  nume: { label: "Profesorul te-a strigat", pattern: [700] },
  intrebare: { label: "Profesorul a pus o întrebare", pattern: [150, 120, 150] },
  tema: { label: "S-a anunțat tema", pattern: [150, 120, 150, 120, 150] },
  atentie: { label: "Atenție!", pattern: [500, 200, 500] },
};

/** Textul alertei pentru profesor: „Andrei nu a înțeles”. */
export function alertText(signId: string, studentName: string, word?: string): string {
  switch (signId) {
    case "nu_inteles":
      return `${studentName} nu a înțeles`;
    case "repetati":
      return `${studentName} vă roagă să repetați`;
    case "intrebare":
      return `${studentName} are o întrebare`;
    case "termen":
      return `${studentName} întreabă despre termen`;
    case "ajutor":
      return `${studentName} are nevoie de ajutor`;
    default:
      return word ? `${studentName}: ${word}` : `${studentName} vrea să intervină`;
  }
}
