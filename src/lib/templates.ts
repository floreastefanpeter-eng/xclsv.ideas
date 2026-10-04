import { articulate } from "./signs";

export interface LessonTemplate {
  id: string;
  subject: string;
  title: string;
  terms: string[];
  quickLines: string[];
}

export const SUBJECTS = [
  "Biologie",
  "Matematică",
  "Limba română",
  "Fizică",
  "Chimie",
  "Istorie",
  "Geografie",
  "Informatică",
  "Limba engleză",
  "Altă materie",
];

export const TEMPLATES: LessonTemplate[] = [
  {
    id: "biologie-fotosinteza",
    subject: "Biologie",
    title: "Fotosinteza",
    terms: ["fotosinteză", "clorofilă", "energie luminoasă"],
    quickLines: [
      "Astăzi vorbim despre fotosinteză.",
      "Plantele își produc singure hrana folosind lumina.",
      "Clorofila este pigmentul verde din frunze.",
      "Energia luminoasă vine de la Soare.",
      "Ați înțeles până aici?",
      "Tema pentru mâine: exercițiile 1, 2 și 3 de la pagina 42.",
    ],
  },
  {
    id: "matematica-ecuatii",
    subject: "Matematică",
    title: "Ecuații",
    terms: ["ecuație", "necunoscută", "soluție"],
    quickLines: [
      "Astăzi învățăm să rezolvăm ecuații.",
      "Necunoscuta este numărul pe care îl căutăm. O notăm cu x.",
      "Soluția este valoarea lui x care face egalitatea adevărată.",
      "De exemplu: x plus 3 egal 7, deci x este 4.",
      "Ați înțeles până aici?",
      "Tema pentru mâine: exercițiile 5 și 6 din manual.",
    ],
  },
];

export function findTemplate(subject: string, title: string): LessonTemplate | undefined {
  return TEMPLATES.find(
    (t) => t.subject.toLowerCase() === subject.toLowerCase() && t.title.toLowerCase() === title.toLowerCase(),
  );
}

/** Replicile rapide: din șablon, sau generice pentru o lecție nouă. */
export function quickLinesFor(subject: string, title: string, terms: string[], studentName: string): string[] {
  const tpl = findTemplate(subject, title);
  if (tpl) return tpl.quickLines;
  const term = terms[0] ? articulate(terms[0]) : "lecția";
  return [
    `Astăzi vorbim despre ${title.toLowerCase()}.`,
    `${studentName}, te rog să fii atent la tablă.`,
    `Să vedem ce înseamnă ${term}.`,
    "Deschideți caietele, vă rog.",
    "Ați înțeles până aici?",
    "Tema pentru mâine: exercițiile de la sfârșitul lecției.",
  ];
}
