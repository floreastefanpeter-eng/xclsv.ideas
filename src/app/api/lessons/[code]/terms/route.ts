import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { authenticate } from "@/lib/supabase/auth-server";
import { extractTermsLocally, type GlossaryEntry } from "@/lib/term-extract";
import type { Lesson, Message } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_TERMS = 8;

const GlossarySchema = z.object({
  terms: z.array(z.object({ term: z.string(), explanation: z.string() })),
});

const SYSTEM_PROMPT = `Ești asistentul unei platforme pentru elevii surzi sau hipoacuzici din România.
Primești replicile profesorului dintr-o lecție în desfășurare și glosarul de până acum.
Alege termenii-cheie ai lecției (concepte de materie, nu cuvinte uzuale), cel mult ${MAX_TERMS} în total.
Păstrează termenii deja existenți dacă sunt încă relevanți și adaugă-i pe cei noi.
Pentru fiecare termen scrie o explicație în română simplă, o singură propoziție de cel mult 14 cuvinte,
ca pentru cineva care aude cuvântul prima dată. Pentru mulți elevi surzi româna scrisă e a doua limbă.
Folosește doar ce reiese din replici. Dacă nu există încă termeni clari, întoarce o listă goală.`;

async function withClaude(lesson: Lesson, sentences: string[], existing: GlossaryEntry[]) {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("Lipsește ANTHROPIC_API_KEY.");
  const client = new Anthropic({ timeout: 25_000, maxRetries: 1 });
  const response = await client.messages.parse({
    model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5",
    max_tokens: 4000,
    system: SYSTEM_PROMPT,
    output_config: { effort: "low", format: zodOutputFormat(GlossarySchema) },
    messages: [
      {
        role: "user",
        content: [
          `Materia: ${lesson.subject}`,
          `Titlul lecției: ${lesson.title}`,
          `Glosarul de până acum: ${JSON.stringify(existing)}`,
          "",
          "<replici>",
          sentences.join("\n"),
          "</replici>",
        ].join("\n"),
      },
    ],
  });
  if (response.stop_reason !== "end_turn") throw new Error(`Răspuns întrerupt (${response.stop_reason}).`);
  const parsed = GlossarySchema.safeParse(response.parsed_output);
  if (!parsed.success) throw new Error("Format invalid.");
  return parsed.data.terms
    .map((t) => ({ term: t.term.trim(), explanation: t.explanation.trim() }))
    .filter((t) => t.term && t.explanation)
    .slice(0, MAX_TERMS);
}

/**
 * POST /api/lessons/[code]/terms — termenii-cheie extrași automat din vorbirea profesorului.
 * Doar profesorul lecției. Scrie lessons.terms + lessons.glossary prin RLS (fără cheia service role);
 * toate ecranele primesc schimbarea prin Postgres Changes.
 */
export async function POST(request: Request, { params }: RouteContext<"/api/lessons/[code]/terms">) {
  const { code: raw } = await params;
  const auth = await authenticate(request);
  if (auth instanceof Response) return auth;
  const { user, db } = auth;

  const { data: lesson } = await db.from("lessons").select("*").eq("code", raw.toUpperCase()).maybeSingle<Lesson>();
  if (!lesson) return Response.json({ error: "Lecția nu există." }, { status: 404 });
  if (lesson.teacher_id !== user.id) return Response.json({ error: "Doar profesorul lecției." }, { status: 403 });

  const { data: messages } = await db
    .from("messages")
    .select("text, sender_role, kind")
    .eq("lesson_id", lesson.id)
    .eq("sender_role", "teacher")
    .neq("kind", "system")
    .order("created_at", { ascending: false })
    .limit(80)
    .returns<Pick<Message, "text" | "sender_role" | "kind">[]>();
  const sentences = (messages ?? []).map((m) => m.text).reverse();
  const existing = Array.isArray(lesson.glossary) ? lesson.glossary : [];

  let glossary: GlossaryEntry[];
  let engine: "claude" | "local";
  try {
    glossary = await withClaude(lesson, sentences, existing);
    engine = "claude";
  } catch {
    glossary = extractTermsLocally(sentences, lesson.title, existing, MAX_TERMS);
    engine = "local";
  }

  // Termenii scriși de profesor la creare rămân primii.
  const auto = new Set([...existing, ...glossary].map((g) => g.term.toLowerCase()));
  const manual = lesson.terms.filter((t) => !auto.has(t.toLowerCase()));
  const terms = [...manual, ...glossary.map((g) => g.term)].slice(0, 12);
  const { error } = await db.from("lessons").update({ terms, glossary }).eq("id", lesson.id);
  if (error) return Response.json({ error: `Nu am putut salva termenii: ${error.message}` }, { status: 500 });

  return Response.json({ terms, glossary, engine });
}
