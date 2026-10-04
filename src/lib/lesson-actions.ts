"use client";

import type { LessonApi } from "@/hooks/use-lesson";
import { detectBuzz, punctuate } from "./alerts";
import { phraseFor, type SignDef } from "./signs";
import type { Lesson, MessageMeta } from "./types";

/**
 * Semnul confirmat al elevului: se inserează mesajul, se trimite semaforul
 * și, dacă e cazul, alerta pentru profesor. Fraza se rostește pe dispozitivul profesorului.
 */
export async function commitSign(
  api: Pick<LessonApi, "insertMessage" | "send">,
  lesson: Lesson,
  sign: SignDef,
  meta: Omit<MessageMeta, "signId" | "fromDictionary"> = {},
) {
  const { text, fromDictionary } = phraseFor(sign, lesson.terms);
  await api.insertMessage({
    sender_role: "student",
    sender_name: lesson.student_name,
    text,
    kind: "sign",
    meta: { ...meta, signId: sign.id, fromDictionary },
  });
  api.send("semafor", { state: sign.state });
  if (sign.alert) api.send("teacher_alert", { signId: sign.id, text, state: sign.state });
  return text;
}

/** Fraza profesorului (vorbită sau scrisă): mesaj + alertele de vibrație pentru elev. */
export async function teacherSay(
  api: Pick<LessonApi, "insertMessage" | "send">,
  lesson: Lesson,
  raw: string,
  kind: "speech" | "typed",
  meta: MessageMeta = {},
) {
  const text = punctuate(raw);
  if (!text) return;
  const buzz = detectBuzz(text, lesson.student_name);
  await api.insertMessage({ sender_role: "teacher", sender_name: "Profesor", text, kind, meta });
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
  return body as {
    summary: import("./types").LessonSummary;
    fallback: boolean;
    notice: string | null;
  };
}
