"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Loader2, Plus, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ensureSession, errorMessage, getSupabase } from "@/lib/supabase/client";
import { SUBJECTS, TEMPLATES } from "@/lib/templates";
import type { Lesson } from "@/lib/types";

/**
 * Lecție nouă: profesorul scrie doar materia și titlul. Termenii-cheie sunt opționali —
 * dacă lipsesc, AI-ul îi extrage din ce spune profesorul în timpul lecției.
 */
export function CreateLessonForm() {
  const router = useRouter();
  const [subject, setSubject] = useState("Biologie");
  const [title, setTitle] = useState("");
  const [terms, setTerms] = useState<string[]>([]);
  const [termDraft, setTermDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applyTemplate = (id: string) => {
    const t = TEMPLATES.find((x) => x.id === id);
    if (!t) return;
    setSubject(t.subject);
    setTitle(t.title);
    setTerms(t.terms);
    setError(null);
  };

  const parseDraft = () =>
    termDraft
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

  const addTerm = () => {
    const parts = parseDraft();
    if (!parts.length) return;
    setTerms((prev) => [...new Set([...prev, ...parts])].slice(0, 12));
    setTermDraft("");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return setError("Scrie titlul lecției.");
    const allTerms = [...new Set([...terms, ...parseDraft()])].slice(0, 12);
    setBusy(true);
    setError(null);
    try {
      await ensureSession();
      const { data, error: rpcError } = await getSupabase().rpc("create_lesson", {
        p_subject: subject,
        p_title: title.trim(),
        p_terms: allTerms,
        p_student_name: null,
      });
      if (rpcError) throw rpcError;
      router.push(`/profesor/${(data as Lesson).code}`);
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" aria-describedby={error ? "create-error" : undefined}>
      <div className="grid gap-4 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="subject" className="text-base font-bold">
            Materia
          </Label>
          <select
            id="subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="h-12 w-full rounded-md border border-input bg-white px-3 text-lg"
          >
            {SUBJECTS.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="title" className="text-base font-bold">
            Titlul lecției
          </Label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="de exemplu: Fotosinteza" className="h-12 bg-white text-lg" />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-bold text-muted-foreground">Șabloane:</span>
        {TEMPLATES.map((t) => (
          <Button key={t.id} type="button" variant="outline" size="sm" onClick={() => applyTemplate(t.id)} className="bg-white">
            {t.subject} · {t.title}
          </Button>
        ))}
      </div>

      <p className="flex items-start gap-2 rounded-md bg-elev-soft px-3 py-2.5 text-elev-dark">
        <Sparkles className="mt-0.5 size-5 shrink-0" aria-hidden />
        <span>
          <strong>Termenii-cheie se notează singuri.</strong> SIGNals îi extrage din ce spui în timpul lecției și îi explică
          simplu pe ecranul elevului.
        </span>
      </p>

      <details className="group rounded-md border border-border bg-white" open={terms.length > 0}>
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-2 px-3 font-bold [&::-webkit-details-marker]:hidden">
          Vrei să adaugi tu termeni? <span className="font-normal text-muted-foreground">(opțional)</span>
          <ChevronDown className="ml-auto size-5 transition-transform group-open:rotate-180" aria-hidden />
        </summary>
        <div className="flex flex-col gap-2 border-t border-border p-3">
          <Label htmlFor="term" className="sr-only">
            Termen nou
          </Label>
          <div className="flex gap-2">
            <Input
              id="term"
              value={termDraft}
              onChange={(e) => setTermDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTerm();
                }
              }}
              placeholder="un termen, apoi Enter"
              className="h-11 bg-white"
              disabled={terms.length >= 12}
            />
            <Button type="button" variant="secondary" onClick={addTerm} disabled={terms.length >= 12}>
              <Plus aria-hidden />
              Adaugă
            </Button>
          </div>
          {terms.length ? (
            <ul className="flex flex-wrap gap-2" aria-label="Termenii adăugați">
              {terms.map((t) => (
                <li key={t} className="inline-flex items-center gap-1 rounded-md bg-elev-soft py-1 pl-3 pr-1 font-bold text-elev-dark">
                  {t}
                  <button
                    type="button"
                    onClick={() => setTerms((prev) => prev.filter((x) => x !== t))}
                    className="inline-flex size-9 items-center justify-center rounded-md hover:bg-white"
                    aria-label={`Șterge termenul ${t}`}
                  >
                    <X className="size-4" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </details>

      {error ? (
        <p id="create-error" role="alert" className="rounded-md bg-danger-soft px-3 py-2 font-bold text-danger-ink">
          {error}
        </p>
      ) : null}

      <Button type="submit" size="lg" className="w-full bg-prof hover:bg-ink" disabled={busy}>
        {busy ? <Loader2 className="animate-spin" aria-hidden /> : null}
        Pornește lecția
      </Button>
    </form>
  );
}
