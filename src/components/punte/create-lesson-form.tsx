"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ensureSession, errorMessage, getSupabase } from "@/lib/supabase/client";
import { SUBJECTS, TEMPLATES } from "@/lib/templates";
import type { Lesson } from "@/lib/types";

export function CreateLessonForm() {
  const router = useRouter();
  const [subject, setSubject] = useState("Biologie");
  const [title, setTitle] = useState("");
  const [terms, setTerms] = useState<string[]>([]);
  const [termDraft, setTermDraft] = useState("");
  const [studentName, setStudentName] = useState("Andrei");
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

  const addTerm = () => {
    const parts = termDraft
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (!parts.length) return;
    setTerms((prev) => [...new Set([...prev, ...parts])].slice(0, 8));
    setTermDraft("");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const allTerms = termDraft.trim()
      ? [...new Set([...terms, ...termDraft.split(",").map((s) => s.trim()).filter(Boolean)])]
      : terms;
    if (!title.trim()) return setError("Scrie titlul lecției.");
    if (allTerms.length < 3 || allTerms.length > 8) return setError("Adaugă între 3 și 8 termeni-cheie.");
    setBusy(true);
    setError(null);
    try {
      await ensureSession();
      const { data, error: rpcError } = await getSupabase().rpc("create_lesson", {
        p_subject: subject,
        p_title: title.trim(),
        p_terms: allTerms,
        p_student_name: studentName.trim() || "Elevul",
      });
      if (rpcError) throw rpcError;
      router.push(`/profesor/${(data as Lesson).code}`);
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5" aria-describedby={error ? "create-error" : undefined}>
      <fieldset>
        <legend className="mb-2 font-bold">Șabloane pentru demo</legend>
        <div className="flex flex-wrap gap-2">
          {TEMPLATES.map((t) => (
            <Button key={t.id} type="button" variant="outline" onClick={() => applyTemplate(t.id)}>
              {t.subject} · {t.title}
            </Button>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="subject" className="text-base font-bold">
            Materia
          </Label>
          <select
            id="subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="h-11 w-full rounded-lg border border-input bg-white px-3 text-base"
          >
            {SUBJECTS.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="student" className="text-base font-bold">
            Numele elevului
          </Label>
          <Input id="student" value={studentName} onChange={(e) => setStudentName(e.target.value)} className="bg-white" />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="title" className="text-base font-bold">
          Titlul lecției
        </Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="de exemplu: Fotosinteza"
          className="bg-white"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="term" className="text-base font-bold">
          Termeni-cheie <span className="font-normal text-muted-foreground">(3–8, devin „dicționarul clasei”)</span>
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
            placeholder="scrie un termen și apasă Enter"
            className="bg-white"
            disabled={terms.length >= 8}
          />
          <Button type="button" variant="secondary" onClick={addTerm} disabled={terms.length >= 8}>
            <Plus aria-hidden />
            Adaugă
          </Button>
        </div>
        {terms.length ? (
          <ul className="flex flex-wrap gap-2 pt-1" aria-label="Termenii lecției">
            {terms.map((t, i) => (
              <li key={t} className="inline-flex items-center gap-1 rounded-full bg-elev-soft py-1 pl-3 pr-1 font-bold text-elev">
                {i === 0 ? <span className="sr-only">Termen principal: </span> : null}
                {t}
                <button
                  type="button"
                  onClick={() => setTerms((prev) => prev.filter((x) => x !== t))}
                  className="inline-flex size-9 items-center justify-center rounded-full hover:bg-white"
                  aria-label={`Șterge termenul ${t}`}
                >
                  <X className="size-4" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <p className="text-sm text-muted-foreground">Primul termen e folosit de semnul „Termen” al elevului.</p>
      </div>

      {error ? (
        <p id="create-error" role="alert" className="rounded-xl bg-[#FEE2E2] px-3 py-2 font-bold text-[#991B1B]">
          {error}
        </p>
      ) : null}

      <Button type="submit" size="lg" className="w-full bg-prof hover:bg-prof-dark" disabled={busy}>
        {busy ? <Loader2 className="animate-spin" aria-hidden /> : null}
        Creează lecția
      </Button>
    </form>
  );
}
