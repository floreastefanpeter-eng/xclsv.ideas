"use client";

import { useEffect, useRef, useState } from "react";
import { ensureSession } from "@/lib/supabase/client";

/** Cache pe pagină, comun tuturor ecranelor: „limbă:text” → traducere. */
const cache = new Map<string, string>();
/** Frazele care n-au putut fi traduse: „limbă:text” → când le reîncercăm (ms). */
const retryAt = new Map<string, number>();

const BATCH = 20;
const RETRY_MS = 20_000;

export type TranslationStatus = "idle" | "working" | "error";

async function translateBatch(texts: string[], target: string): Promise<(string | null)[]> {
  const session = await ensureSession();
  const res = await fetch("/api/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify({ texts, target }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.error ?? `Eroare ${res.status}`);
  return body.translations as (string | null)[];
}

/**
 * Traduce textele date (id → text) în limba elevului: întâi cele mai noi (cele de pe ecran),
 * apoi tot istoricul, în loturi de câte 20. Originalul apare imediat; traducerea vine după.
 * O frază care nu se poate traduce acum se reîncearcă singură, fără să le blocheze pe celelalte.
 */
export function useTranslations(items: { id: string; text: string }[], lang: string) {
  const [version, setVersion] = useState(0);
  const [status, setStatus] = useState<TranslationStatus>("idle");
  const inFlight = useRef(new Set<string>());

  useEffect(() => {
    if (lang === "ro") return;
    const now = Date.now();
    const key = (t: string) => `${lang}:${t}`;
    // Cele mai noi întâi: elevul vede imediat ce se spune acum, apoi se completează istoricul.
    const pending = [...new Set([...items].reverse().map((i) => i.text))].filter(
      (t) => !cache.has(key(t)) && !inFlight.current.has(key(t)) && (retryAt.get(key(t)) ?? 0) <= now,
    );
    if (!pending.length) {
      // Doar frazele amânate au rămas: revenim când expiră prima amânare.
      const next = Math.min(...items.map((i) => retryAt.get(key(i.text)) ?? Infinity).filter((t) => t > now));
      if (!Number.isFinite(next)) return;
      const t = setTimeout(() => setVersion((v) => v + 1), next - now + 50);
      return () => clearTimeout(t);
    }
    const timer = setTimeout(async () => {
      const batch = pending.slice(0, BATCH);
      batch.forEach((t) => inFlight.current.add(key(t)));
      setStatus("working");
      try {
        const out = await translateBatch(batch, lang);
        batch.forEach((t, i) => {
          if (out[i] && out[i] !== t) {
            cache.set(key(t), out[i]!);
            retryAt.delete(key(t));
          } else if (out[i] === t) {
            cache.set(key(t), t);
          } else retryAt.set(key(t), Date.now() + RETRY_MS);
        });
        setStatus(out.some((o) => !o) ? "error" : "idle");
      } catch {
        batch.forEach((t) => retryAt.set(key(t), Date.now() + RETRY_MS));
        setStatus("error");
      } finally {
        batch.forEach((t) => inFlight.current.delete(key(t)));
        setVersion((v) => v + 1);
      }
    }, 120);
    return () => clearTimeout(timer);
  }, [items, lang, version]);

  const map = new Map<string, string>();
  if (lang !== "ro") {
    for (const i of items) {
      const t = cache.get(`${lang}:${i.text}`);
      if (t && t !== i.text) map.set(i.id, t);
    }
  }
  // „error” doar cât timp chiar lipsesc traduceri din ce e pe ecran.
  const missing = lang !== "ro" && items.some((i) => !cache.has(`${lang}:${i.text}`));
  return { translations: map, status: lang === "ro" ? ("idle" as const) : status === "error" && !missing ? ("idle" as const) : status };
}
