import type { Message } from "./types";

export interface SummaryContent {
  notes: string[];
  homework: string | null;
  terms: string[];
  simple_summary: string;
}

function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

/**
 * Rezumat de rezervă, generat local, fără AI.
 * Folosit când apelul către Claude eșuează sau nu există cheie API.
 */
export function fallbackSummary(input: {
  subject: string;
  title: string;
  terms: string[];
  studentName: string;
  messages: Pick<Message, "sender_role" | "text" | "kind" | "meta">[];
}): SummaryContent {
  const teacherLines = input.messages
    .filter((m) => m.sender_role === "teacher" && m.kind !== "system")
    .map((m) => m.text.trim())
    .filter(Boolean);

  const homeworkLine = [...teacherLines].reverse().find((l) => /\b(tema|test|maine)\b/.test(normalize(l)));

  // Ideile principale: frazele profesorului care conțin termeni ai lecției, apoi cele mai lungi.
  const termKeys = input.terms.map((t) => normalize(t).slice(0, Math.max(4, normalize(t).length - 2)));
  const withTerms = teacherLines.filter(
    (l) => l !== homeworkLine && !l.endsWith("?") && termKeys.some((k) => normalize(l).includes(k)),
  );
  const others = teacherLines
    .filter((l) => l !== homeworkLine && !l.endsWith("?") && !withTerms.includes(l))
    .sort((a, b) => b.length - a.length);
  const notes = unique([...withTerms, ...others]).slice(0, 5);
  if (notes.length === 0) notes.push(`Lecția a fost despre ${input.title.toLowerCase()}.`);

  const terms = input.terms.map((term) => {
    const key = termKeys[input.terms.indexOf(term)];
    const explain = teacherLines.find((l) => normalize(l).includes(key) && / (este|inseamna|sunt) /.test(normalize(l)));
    return explain ? `${term}: ${explain}` : `${term}: termen important din lecția de ${input.subject.toLowerCase()}.`;
  });

  const signs = input.messages.filter((m) => m.sender_role === "student" && m.kind === "sign");
  const notUnderstood = signs.filter((m) => m.meta?.signId === "nu_inteles" || m.meta?.signId === "repetati").length;

  const simple = [
    `Azi am avut ${input.subject.toLowerCase()}.`,
    `Lecția se numește „${input.title}”.`,
    input.terms.length ? `Cuvinte noi: ${input.terms.join(", ")}.` : "",
    notUnderstood ? `Profesorul a explicat din nou de ${notUnderstood} ori.` : "",
    homeworkLine ? `Ai temă. ${homeworkLine}` : "Nu ai temă anunțată.",
  ]
    .filter(Boolean)
    .join(" ");

  return { notes, homework: homeworkLine ?? null, terms, simple_summary: simple };
}

function unique(list: string[]) {
  return [...new Set(list)];
}
