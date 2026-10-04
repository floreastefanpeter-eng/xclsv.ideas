import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { fallbackSummary, type SummaryContent } from "@/lib/summary-fallback";
import type { Lesson, Message } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const SummarySchema = z.object({
  notes: z.array(z.string()),
  homework: z.string().nullable(),
  terms: z.array(z.string()),
  simple_summary: z.string(),
});

const SYSTEM_PROMPT = `Ești asistentul unei platforme pentru elevii surzi sau hipoacuzici din România.
Primești transcrierea unei lecții: replicile profesorului (din vocea lui, transformată în text) și semnele elevului (transformate în fraze).
Scrii „memoria lecției”, în limba română, pentru elevul surd. Pentru mulți dintre acești elevi, româna scrisă este a doua limbă (prima este limbajul mimico-gestual), așa că:
- folosește cuvinte simple și propoziții scurte, de cel mult 12 cuvinte;
- nu folosi expresii figurate sau construcții complicate;
- explică fiecare termen nou ca pentru cineva care îl aude prima dată.

Câmpurile răspunsului:
- notes: 3–6 idei principale ale lecției, câte o propoziție simplă fiecare.
- homework: tema exactă, cu paginile și exercițiile, doar dacă profesorul a anunțat-o; altfel null. Nu inventa o temă.
- terms: termenii noi apăruți în lecție, fiecare în forma „termen: explicație scurtă”.
- simple_summary: un rezumat de 3–5 propoziții scurte, în română simplă.

Folosește doar informații din transcriere și din termenii lecției. Dacă transcrierea e scurtă, scrie mai puține idei, nu inventa conținut.`;

function transcriptOf(messages: Message[], studentName: string) {
  return messages
    .filter((m) => m.kind !== "system")
    .map((m) => {
      const who = m.sender_role === "teacher" ? "Profesor" : `${studentName} (elev, prin semne)`;
      return `${who}: ${m.text}`;
    })
    .join("\n");
}

function clean(summary: SummaryContent): SummaryContent {
  const trim = (s: string) => s.trim();
  return {
    notes: summary.notes.map(trim).filter(Boolean).slice(0, 6),
    homework: summary.homework?.trim() || null,
    terms: summary.terms.map(trim).filter(Boolean).slice(0, 12),
    simple_summary: summary.simple_summary.trim(),
  };
}

async function summarizeWithClaude(lesson: Lesson, messages: Message[]): Promise<SummaryContent> {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("Lipsește ANTHROPIC_API_KEY.");
  const client = new Anthropic({ timeout: 45_000, maxRetries: 1 });
  const response = await client.messages.parse({
    model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5",
    max_tokens: 4000,
    system: SYSTEM_PROMPT,
    output_config: { effort: "low", format: zodOutputFormat(SummarySchema) },
    messages: [
      {
        role: "user",
        content: [
          `Materia: ${lesson.subject}`,
          `Titlul lecției: ${lesson.title}`,
          `Termenii lecției: ${lesson.terms.join(", ")}`,
          `Numele elevului: ${lesson.student_name}`,
          "",
          "<transcriere>",
          transcriptOf(messages, lesson.student_name) || "(fără replici)",
          "</transcriere>",
        ].join("\n"),
      },
    ],
  });
  if (response.stop_reason === "refusal") throw new Error("Modelul a refuzat cererea.");
  if (response.stop_reason === "max_tokens") throw new Error("Răspunsul AI a fost întrerupt.");
  const parsed = SummarySchema.safeParse(response.parsed_output);
  if (!parsed.success) throw new Error("Răspunsul AI nu respectă formatul JSON cerut.");
  const result = clean(parsed.data);
  if (result.notes.length === 0 || !result.simple_summary) throw new Error("Răspunsul AI este gol.");
  return result;
}

/**
 * POST /api/lessons/[code]/summary — apelat când profesorul încheie lecția.
 * Doar profesorul lecției îl poate apela. Scrie în lesson_summaries cu cheia service role.
 */
export async function POST(request: Request, { params }: RouteContext<"/api/lessons/[code]/summary">) {
  const { code: raw } = await params;
  const code = raw.toUpperCase();
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return Response.json({ error: "Autentificare necesară." }, { status: 401 });

  let admin;
  try {
    admin = getSupabaseAdmin();
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }

  const { data: userData, error: userError } = await admin.auth.getUser(token);
  if (userError || !userData.user) return Response.json({ error: "Sesiune invalidă." }, { status: 401 });

  const { data: lesson } = await admin.from("lessons").select("*").eq("code", code).maybeSingle<Lesson>();
  if (!lesson) return Response.json({ error: "Lecția nu există." }, { status: 404 });
  if (lesson.teacher_id !== userData.user.id) {
    return Response.json({ error: "Doar profesorul lecției o poate încheia." }, { status: 403 });
  }

  const { data: messages } = await admin
    .from("messages")
    .select("*")
    .eq("lesson_id", lesson.id)
    .order("created_at")
    .limit(1000)
    .returns<Message[]>();

  let content: SummaryContent;
  let fallback = false;
  let notice: string | null = null;
  try {
    content = await summarizeWithClaude(lesson, messages ?? []);
  } catch (e) {
    console.error("[summary] Claude a eșuat:", e);
    fallback = true;
    notice = `Memoria lecției a fost generată local, fără AI (${(e as Error).message}).`;
    content = fallbackSummary({
      subject: lesson.subject,
      title: lesson.title,
      terms: lesson.terms,
      studentName: lesson.student_name,
      messages: messages ?? [],
    });
  }

  const { data: saved, error: saveError } = await admin
    .from("lesson_summaries")
    .upsert({ lesson_id: lesson.id, ...content, created_at: new Date().toISOString() })
    .select()
    .single();
  if (saveError) return Response.json({ error: `Nu am putut salva memoria lecției: ${saveError.message}` }, { status: 500 });

  await admin.from("lessons").update({ status: "ended", ended_at: new Date().toISOString() }).eq("id", lesson.id);

  const summary = { ...saved, fallback };
  // summary_ready pe canalul lecției (Broadcast prin REST, fără abonare)
  try {
    await admin.channel(`lesson:${lesson.code}`).httpSend("summary_ready", { summary });
  } catch (e) {
    console.warn("[summary] Broadcast summary_ready a eșuat:", e);
  }

  return Response.json({ summary, fallback, notice });
}
