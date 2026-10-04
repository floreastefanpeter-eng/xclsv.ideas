"use client";

import { useEffect, useRef, useState } from "react";
import { ensureSession } from "@/lib/supabase/client";

/** Cache pe pagină, comun tuturor ecranelor: „limbă:text” → traducere. */
const cache = new Map<string, string>();

export type TranslationStatus = "idle" | "working" | "error";

async function translateBatch(texts: string[], target: string): Promise<string[]> {
  const session = await ensureSession();
  const res = await fetch("/api/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify({ texts, target }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.error ?? `Eroare ${res.status}`);
  return body.translations as string[];
}

/**
 * Traduce textele date (id → text) în limba elevului. Originalul apare imediat;
 * traducerea vine după, în loturi de până la 20, fără să blocheze nimic.
 */
export function useTranslations(items: { id: string; text: string }[], lang: string) {
  const [version, setVersion] = useState(0);
  const [status, setStatus] = useState<TranslationStatus>("idle");
  const inFlight = useRef(new Set<string>());
  const failedAt = useRef(0);

  useEffect(() => {
    if (lang === "ro") return;
    const pending = items.filter((i) => !cache.has(`${lang}:${i.text}`) && !inFlight.current.has(`${lang}:${i.text}`));
    if (!pending.length) return;
    // După o eroare, așteptăm puțin înainte să reîncercăm (de ex. limita API-ului gratuit).
    const wait = Math.max(150, failedAt.current + 8000 - Date.now());
    const timer = setTimeout(async () => {
      const batch = [...new Set(pending.map((p) => p.text))].slice(0, 20);
      batch.forEach((t) => inFlight.current.add(`${lang}:${t}`));
      setStatus("working");
      try {
        const out = await translateBatch(batch, lang);
        // Și un rezultat gol intră în cache, ca să nu reîncercăm la nesfârșit.
        batch.forEach((t, i) => cache.set(`${lang}:${t}`, out[i] || t));
        setStatus("idle");
      } catch {
        failedAt.current = Date.now();
        setStatus("error");
      } finally {
        batch.forEach((t) => inFlight.current.delete(`${lang}:${t}`));
        setVersion((v) => v + 1);
      }
    }, wait);
    return () => clearTimeout(timer);
  }, [items, lang, version]);

  const map = new Map<string, string>();
  if (lang !== "ro") {
    for (const i of items) {
      const t = cache.get(`${lang}:${i.text}`);
      if (t && t !== i.text) map.set(i.id, t);
    }
  }
  return { translations: map, status: lang === "ro" ? ("idle" as const) : status };
}
