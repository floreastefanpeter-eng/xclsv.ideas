import { articulate } from "./signs";

export interface LessonTemplate {
  id: string;
  subject: string;
  title: string;
  terms: string[];
  quickLines: string[];
  /** Replicile profesorului din modul demo. {nume} se înlocuiește cu numele elevului. */
  demo: {
    call: string;
    repeat: string;
    termAnswer: string;
    homework: string;
  };
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
    demo: {
      call: "{nume}, te rog să fii atent la tablă. Astăzi vorbim despre fotosinteză.",
      repeat:
        "Repet mai simplu: plantele iau lumina de la Soare, apă și aer, și din ele își fac singure hrana.",
      termAnswer:
        "Clorofila este pigmentul verde din frunze. Ea prinde energia luminoasă și o folosește ca să facă hrana plantei.",
      homework: "Tema pentru mâine: exercițiile 1, 2 și 3 de la pagina 42.",
    },
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
    demo: {
      call: "{nume}, te rog să fii atent la tablă. Astăzi învățăm să rezolvăm ecuații.",
      repeat:
        "Repet mai simplu: o ecuație este o egalitate în care lipsește un număr. Noi trebuie să găsim acel număr.",
      termAnswer:
        "Ecuația este o egalitate cu o necunoscută, de obicei x. De exemplu: x plus 3 egal 7. Soluția este 4.",
      homework: "Tema pentru mâine: exercițiile 5 și 6 din manual.",
    },
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

export function demoLinesFor(subject: string, title: string, terms: string[], studentName: string) {
  const tpl = findTemplate(subject, title);
  const fill = (s: string) => s.replaceAll("{nume}", studentName);
  if (tpl) {
    return {
      call: fill(tpl.demo.call),
      repeat: fill(tpl.demo.repeat),
      termAnswer: fill(tpl.demo.termAnswer),
      homework: fill(tpl.demo.homework),
    };
  }
  const term = terms[0] ? articulate(terms[0]) : "termenul";
  return {
    call: `${studentName}, te rog să fii atent la tablă. Astăzi vorbim despre ${title.toLowerCase()}.`,
    repeat: `Repet mai simplu: astăzi învățăm ce este ${term} și la ce folosește.`,
    termAnswer: `${capitalize(term)} este ideea principală a lecției de azi. O vom folosi în toate exercițiile.`,
    homework: "Tema pentru mâine: exercițiile de la sfârșitul lecției.",
  };
}

function capitalize(s: string) {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}
