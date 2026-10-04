import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { authenticate } from "@/lib/supabase/auth-server";
import { isLanguage, languageName } from "@/lib/languages";

export const runtime = "nodejs";
export const maxDuration = 30;

const Body = z.object({
  texts: z.array(z.string().min(1).max(600)).min(1).max(20),
  target: z.string(),
});

const TranslationSchema = z.object({ translations: z.array(z.string()) });

/** Cache pe instanța serverului: aceeași frază nu se traduce de două ori. */
const cache = new Map<string, string>();
const CACHE_LIMIT = 4000;

function remember(key: string, value: string) {
  if (cache.size >= CACHE_LIMIT) cache.delete(cache.keys().next().value!);
  cache.set(key, value);
}

async function withClaude(texts: string[], target: string): Promise<string[]> {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("Lipsește ANTHROPIC_API_KEY.");
  const client = new Anthropic({ timeout: 20_000, maxRetries: 1 });
  const response = await client.messages.parse({
    model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5",
    max_tokens: 4000,
    system: `Traduci replicile unei lecții din română în ${languageName(target)} (cod ${target}) pentru un elev surd.
Păstrează sensul exact, numerele, paginile și termenii tehnici. Folosește propoziții simple și clare.
Răspunzi cu exact o traducere pentru fiecare replică, în aceeași ordine. Nu adăuga explicații.`,
    output_config: { effort: "low", format: zodOutputFormat(TranslationSchema) },
    messages: [{ role: "user", content: JSON.stringify(texts) }],
  });
  if (response.stop_reason !== "end_turn") throw new Error(`Traducere întreruptă (${response.stop_reason}).`);
  const parsed = TranslationSchema.safeParse(response.parsed_output);
  if (!parsed.success || parsed.data.translations.length !== texts.length) throw new Error("Format de traducere invalid.");
  return parsed.data.translations;
}

/** API-ul public MyMemory (gratuit, fără cheie) — rezerva când nu există AI. */
async function withMyMemory(texts: string[], target: string): Promise<string[]> {
  return Promise.all(
    texts.map(async (text) => {
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=ro|${target}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) throw new Error(`MyMemory ${res.status}`);
      const body = (await res.json()) as { responseStatus?: number; responseData?: { translatedText?: string } };
      const out = body.responseData?.translatedText;
      if (body.responseStatus !== 200 || !out) throw new Error("MyMemory nu a putut traduce.");
      return out;
    }),
  );
}

/**
 * POST /api/translate — traduce subtitrările pentru elev.
 * Claude (dacă există cheie), apoi MyMemory. Cere orice sesiune Supabase validă (și ecranele anonime).
 */
export async function POST(request: Request) {
  const auth = await authenticate(request);
  if (auth instanceof Response) return auth;

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Cerere invalidă." }, { status: 400 });
  const { texts, target } = parsed.data;
  if (!isLanguage(target)) return Response.json({ error: "Limbă necunoscută." }, { status: 400 });
  if (target === "ro") return Response.json({ translations: texts, engine: "original" });

  const result: (string | null)[] = texts.map((t) => cache.get(`${target}:${t}`) ?? null);
  const missing = texts.filter((_, i) => result[i] === null);
  let engine: "claude" | "mymemory" | "cache" = "cache";

  if (missing.length) {
    let translated: string[];
    try {
      translated = await withClaude(missing, target);
      engine = "claude";
    } catch {
      try {
        translated = await withMyMemory(missing, target);
        engine = "mymemory";
      } catch (e) {
        return Response.json({ error: `Traducerea nu este disponibilă acum (${(e as Error).message}).` }, { status: 502 });
      }
    }
    let j = 0;
    texts.forEach((t, i) => {
      if (result[i] !== null) return;
      const out = translated[j++];
      result[i] = out;
      remember(`${target}:${t}`, out);
    });
  }

  return Response.json({ translations: result, engine });
}
