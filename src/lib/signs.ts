import type { BuzzKind, SemaforState } from "./types";

export type SignId = "nu_inteles" | "repetati" | "intrebare" | "termen" | "terminat" | "multumesc";
export const NONE_SIGN = "fara_semn";
export type TrainLabel = SignId | typeof NONE_SIGN;

export interface SignDef {
  id: SignId;
  key: string; // tasta de rezervă 1–6
  label: string;
  phrase: string;
  state: SemaforState;
  alert: boolean;
  hint: string;
}

/** Cele 6 semne din „Modul Classroom”. */
export const SIGNS: SignDef[] = [
  {
    id: "nu_inteles",
    key: "1",
    label: "Nu am înțeles",
    phrase: "Nu am înțeles.",
    state: "neinteles",
    alert: true,
    hint: "De exemplu: palma deschisă, degetele lipite, în fața pieptului.",
  },
  {
    id: "repetati",
    key: "2",
    label: "Repetați",
    phrase: "Puteți repeta, vă rog?",
    state: "neinteles",
    alert: true,
    hint: "De exemplu: degetul arătător ridicat, rotit în cerc.",
  },
  {
    id: "intrebare",
    key: "3",
    label: "Am o întrebare",
    phrase: "Am o întrebare.",
    state: "intrebare",
    alert: true,
    hint: "De exemplu: mâna ridicată, palma spre cameră.",
  },
  {
    id: "termen",
    key: "4",
    label: "Termen",
    phrase: "Ce înseamnă termenul lecției?",
    state: "intrebare",
    alert: true,
    hint: "De exemplu: degetul mare și arătătorul formând litera „C”.",
  },
  {
    id: "terminat",
    key: "5",
    label: "Am terminat",
    phrase: "Am terminat exercițiul.",
    state: "inteles",
    alert: false,
    hint: "De exemplu: degetul mare ridicat.",
  },
  {
    id: "multumesc",
    key: "6",
    label: "Mulțumesc",
    phrase: "Mulțumesc!",
    state: "inteles",
    alert: false,
    hint: "De exemplu: vârful degetelor la bărbie, apoi mâna spre înainte.",
  },
];

export const NONE_DEF = {
  id: NONE_SIGN,
  label: "Fără semn",
  hint: "Mâinile în poziție de repaus sau gesturi obișnuite, ca să nu fie confundate cu semne.",
};

export const TRAIN_LABELS: { id: TrainLabel; label: string; hint: string }[] = [
  ...SIGNS.map((s) => ({ id: s.id as TrainLabel, label: s.label, hint: s.hint })),
  NONE_DEF as { id: TrainLabel; label: string; hint: string },
];

export function getSign(id: string): SignDef | undefined {
  return SIGNS.find((s) => s.id === id);
}

export function signByKey(key: string): SignDef | undefined {
  return SIGNS.find((s) => s.key === key);
}

/** Forma de articulare simplă pentru termeni: „clorofilă” → „clorofila”. */
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

/** Fraza rostită pentru un semn, ținând cont de termenul principal al lecției. */
export function phraseFor(sign: SignDef, terms: string[]): { text: string; fromDictionary: boolean } {
  if (sign.id === "termen" && terms.length > 0) {
    return { text: `Ce este ${articulate(terms[0])}?`, fromDictionary: true };
  }
  return { text: sign.phrase, fromDictionary: false };
}

export const SEMAFOR_META: Record<SemaforState, { label: string; color: string; short: string }> = {
  neutru: { label: "În așteptare", color: "#94A3B8", short: "Neutru" },
  semneaza: { label: "Semnează…", color: "#2563EB", short: "Semnează" },
  intrebare: { label: "Vrea să intervină", color: "#F59E0B", short: "Întrebare" },
  inteles: { label: "A înțeles", color: "#15803D", short: "A înțeles" },
  neinteles: { label: "Nu a înțeles", color: "#DC2626", short: "Nu a înțeles" },
};

export const BUZZ_META: Record<BuzzKind, { label: string; pattern: number[] }> = {
  nume: { label: "Profesorul te-a strigat", pattern: [700] },
  intrebare: { label: "Profesorul a pus o întrebare", pattern: [150, 120, 150] },
  tema: { label: "S-a anunțat tema", pattern: [150, 120, 150, 120, 150] },
  atentie: { label: "Atenție!", pattern: [500, 200, 500] },
};

/** Textul alertei pentru profesor: „Andrei nu a înțeles”. */
export function alertText(signId: string, studentName: string): string {
  switch (signId) {
    case "nu_inteles":
      return `${studentName} nu a înțeles`;
    case "repetati":
      return `${studentName} vă roagă să repetați`;
    case "intrebare":
      return `${studentName} are o întrebare`;
    case "termen":
      return `${studentName} întreabă despre termen`;
    default:
      return `${studentName} vrea să intervină`;
  }
}
