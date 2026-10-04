import type { Message } from "./types";

export interface LessonStats {
  teacherMessages: number;
  signsSent: number;
  signsCamera: number;
  signsManual: number;
  signsAsl: number;
  unknown: number;
  alerts: number;
  acks: number;
  medianAckMs: number | null;
  avgConfidence: number | null;
  durationMin: number | null;
}

export interface Hypothesis {
  id: string;
  text: string;
  metric: string;
  target: string;
  /** null = nu sunt încă destule date în lecție. */
  passed: boolean | null;
}

const ALERT_SIGNS = new Set(["nu_inteles", "repetati", "intrebare", "termen", "ajutor"]);

function isAlert(m: Message) {
  if (m.sender_role !== "student" || m.kind !== "sign") return false;
  return !!m.meta?.alert || ALERT_SIGNS.has(m.meta?.signId ?? "");
}

function median(values: number[]) {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

/** Statisticile lecției, calculate din conversația reală (fără date inventate). */
export function computeStats(messages: Message[]): LessonStats {
  const signs = messages.filter((m) => m.sender_role === "student" && m.kind === "sign");
  const acks = messages.filter((m) => m.kind === "system" && typeof m.meta?.latencyMs === "number");
  const camera = signs.filter((m) => !m.meta?.manual);
  const confidences = camera.map((m) => m.meta?.confidence).filter((c): c is number => typeof c === "number");
  const first = messages[0]?.created_at;
  const last = messages.at(-1)?.created_at;
  return {
    teacherMessages: messages.filter((m) => m.sender_role === "teacher" && m.kind !== "system").length,
    signsSent: signs.length,
    signsCamera: camera.length,
    signsManual: signs.length - camera.length,
    signsAsl: signs.filter((m) => m.meta?.engine === "asl").length,
    unknown: messages.filter((m) => m.kind === "system" && m.meta?.unknown).length,
    alerts: signs.filter(isAlert).length,
    acks: acks.length,
    medianAckMs: median(acks.map((m) => m.meta!.latencyMs!)),
    avgConfidence: confidences.length ? confidences.reduce((a, b) => a + b, 0) / confidences.length : null,
    durationMin:
      first && last ? Math.max(1, Math.round((new Date(last).getTime() - new Date(first).getTime()) / 60000)) : null,
  };
}

/** Ipotezele testate de Punte în fiecare lecție. */
export function evaluateHypotheses(s: LessonStats): Hypothesis[] {
  const attempts = s.signsCamera + s.unknown;
  const recognized = attempts ? s.signsCamera / attempts : null;
  const automatic = s.signsSent ? s.signsCamera / s.signsSent : null;
  return [
    {
      id: "H1",
      text: "Profesorul observă că elevul nu a înțeles în mai puțin de 10 secunde.",
      metric: s.medianAckMs === null ? "nicio alertă confirmată" : `mediana: ${(s.medianAckMs / 1000).toFixed(1)} s (${s.acks} alerte)`,
      target: "< 10 s",
      passed: s.medianAckMs === null ? null : s.medianAckMs < 10_000,
    },
    {
      id: "H2",
      text: "Camera recunoaște majoritatea semnelor încercate de elev.",
      metric: recognized === null ? "niciun semn încercat la cameră" : `${Math.round(recognized * 100)}% (${s.signsCamera} din ${attempts})`,
      target: "≥ 70%",
      passed: recognized === null ? null : recognized >= 0.7,
    },
    {
      id: "H3",
      text: "Elevul comunică mai ales prin semne, nu prin butoane.",
      metric: automatic === null ? "niciun semn trimis" : `${Math.round(automatic * 100)}% din semne prin cameră`,
      target: "≥ 50%",
      passed: automatic === null ? null : automatic >= 0.5,
    },
  ];
}

export function statsToCsv(lessonCode: string, s: LessonStats, hypotheses: Hypothesis[]) {
  const rows: [string, string | number][] = [
    ["lectie", lessonCode],
    ["durata_min", s.durationMin ?? ""],
    ["mesaje_profesor", s.teacherMessages],
    ["semne_trimise", s.signsSent],
    ["semne_camera", s.signsCamera],
    ["semne_manual", s.signsManual],
    ["semne_model_asl", s.signsAsl],
    ["semne_necunoscute", s.unknown],
    ["alerte", s.alerts],
    ["alerte_confirmate", s.acks],
    ["timp_reactie_median_ms", s.medianAckMs ?? ""],
    ["incredere_medie", s.avgConfidence === null ? "" : s.avgConfidence.toFixed(2)],
    ...hypotheses.map((h): [string, string] => [h.id, h.passed === null ? "date insuficiente" : h.passed ? "confirmata" : "infirmata"]),
  ];
  return "indicator,valoare\n" + rows.map(([k, v]) => `${k},${String(v).replaceAll(",", ";")}`).join("\n");
}
