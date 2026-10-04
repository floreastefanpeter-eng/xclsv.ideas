"use client";

import type { LessonApi } from "@/hooks/use-lesson";
import { detectBuzz, punctuate } from "./alerts";
import { phraseFor, type SignDef } from "./signs";
import type { Lesson, LessonSummary, MessageMeta, SemaforState } from "./types";

/**
 * Semnul confirmat al elevului: se inserează mesajul (cuvântul din dicționar),
 * se trimite semaforul și, dacă e cazul, alerta pentru profesor.
 * Fraza se rostește pe dispozitivul profesorului.
 */
export async function commitSign(
  api: Pick<LessonApi, "insertMessage" | "send">,
  lesson: Lesson,
  sign: SignDef,
  previous: SemaforState,
  meta: Omit<MessageMeta, "signId" | "word" | "fromDictionary" | "alert"> = {},
) {
  const { text, fromDictionary } = phraseFor(sign, lesson.terms);
  await api.insertMessage({
    sender_role: "student",
    sender_name: lesson.student_name,
    text,
    kind: "sign",
    meta: { ...meta, signId: sign.id, word: sign.word, fromDictionary, alert: sign.alert || undefined },
  });
  // Cuvintele fără stare proprie (de exemplu „APĂ”) readuc semaforul unde era.
  api.send("semafor", { state: sign.state ?? (previous === "semneaza" ? "neutru" : previous) });
  if (sign.alert) api.send("teacher_alert", { signId: sign.id, text, state: sign.state, word: sign.word });
  return text;
}

/** Un semn făcut, dar nerecunoscut: apare în conversație ca „Semn necunoscut”, fără voce. */
export async function reportUnknown(
  api: Pick<LessonApi, "insertMessage">,
  lesson: Lesson,
  meta: Pick<MessageMeta, "engine" | "top" | "confidence">,
) {
  await api.insertMessage({
    sender_role: "student",
    sender_name: lesson.student_name,
    text: "Semn necunoscut",
    kind: "system",
    meta: { ...meta, unknown: true },
  });
}

/** Profesorul a văzut alerta: se păstrează timpul de reacție (pentru statisticile lecției). */
export async function acknowledgeAlert(
  api: Pick<LessonApi, "insertMessage" | "send">,
  /** Mesajul de alertă și momentul (local) în care a ajuns la profesor — evită diferențele de ceas. */
  alertMessage: { id: string; receivedAt: number } | null,
  signId?: string,
) {
  api.send("teacher_alert_ack", { signId });
  if (!alertMessage) return;
  const latencyMs = Math.max(0, Date.now() - alertMessage.receivedAt);
  await api.insertMessage({
    sender_role: "teacher",
    sender_name: "Profesor",
    text: `Profesorul a văzut (${Math.round(latencyMs / 1000)} s)`,
    kind: "system",
    meta: { ackOf: alertMessage.id, latencyMs },
  });
}

/** Fraza profesorului (vorbită sau scrisă): mesaj + alertele de vibrație pentru elev. */
export async function teacherSay(
  api: Pick<LessonApi, "insertMessage" | "send">,
  lesson: Lesson,
  raw: string,
  kind: "speech" | "typed",
) {
  const text = punctuate(raw);
  if (!text) return;
  const buzz = detectBuzz(text, lesson.student_name);
  await api.insertMessage({ sender_role: "teacher", sender_name: "Profesor", text, kind });
  if (buzz) api.send("buzz", { kind: buzz, text });
}

/** Încheie lecția și cere memoria lecției de la server. */
export async function requestSummary(code: string, accessToken: string) {
  const res = await fetch(`/api/lessons/${code}/summary`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.error ?? `Eroare ${res.status}`);
  return body as { summary: LessonSummary; fallback: boolean; notice: string | null };
}
