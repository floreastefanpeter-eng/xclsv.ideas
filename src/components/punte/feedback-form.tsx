"use client";

import { useState } from "react";
import { Check, Loader2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ensureSession, errorMessage, getSupabase } from "@/lib/supabase/client";
import type { Role } from "@/lib/types";
import { cn } from "@/lib/utils";

function Stars({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  return (
    <fieldset>
      <legend className="mb-1 font-bold">{label}</legend>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className="inline-flex size-11 items-center justify-center rounded-xl hover:bg-muted"
            aria-label={`${n} din 5`}
            aria-pressed={value === n}
          >
            <Star className={cn("size-8", n <= value ? "fill-prof text-prof" : "text-ink/30")} aria-hidden />
          </button>
        ))}
      </div>
    </fieldset>
  );
}

/** Feedback la finalul lecției: dovezi reale pentru validarea soluției. */
export function FeedbackForm({ lessonId, role }: { lessonId: string; role: Exclude<Role, "class"> }) {
  const [rating, setRating] = useState(0);
  const [understood, setUnderstood] = useState(0);
  const [comment, setComment] = useState("");
  const [quote, setQuote] = useState("");
  const [publicQuote, setPublicQuote] = useState(false);
  const [state, setState] = useState<"idle" | "saving" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rating) return setError("Alege o notă de la 1 la 5.");
    setState("saving");
    setError(null);
    try {
      const session = await ensureSession();
      const { error: dbError } = await getSupabase().from("lesson_feedback").upsert({
        lesson_id: lessonId,
        user_id: session.user.id,
        role,
        rating,
        understood: understood || null,
        comment: comment.trim() || null,
        quote: quote.trim() || null,
        // Se publică doar cu acordul explicit și doar dacă există un text.
        public_quote: publicQuote && !!quote.trim(),
      });
      if (dbError) throw dbError;
      setState("done");
    } catch (err) {
      setError(errorMessage(err));
      setState("idle");
    }
  };

  if (state === "done") {
    return (
      <p className="flex items-center gap-2 rounded-xl bg-ok-soft p-4 text-lg font-bold text-ok-ink" role="status">
        <Check className="size-6" aria-hidden />
        {publicQuote && quote.trim() ? "Mulțumim! Testimonialul tău apare pe pagina de testimoniale." : "Mulțumim pentru feedback!"}
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-xl border-2 border-ink/10 bg-white p-5">
      <h2 className="font-display text-2xl font-semibold">Cum a fost lecția?</h2>
      <Stars value={rating} onChange={setRating} label="Nota generală" />
      <Stars
        value={understood}
        onChange={setUnderstood}
        label={role === "student" ? "Cât de bine ai înțeles lecția?" : "Cât de bine ați înțeles ce voia elevul?"}
      />
      <label className="block">
        <span className="mb-1 block font-bold">Ce ar trebui îmbunătățit? (opțional)</span>
        <Textarea value={comment} onChange={(e) => setComment(e.target.value)} maxLength={1000} className="bg-white text-lg" />
      </label>
      <label className="block">
        <span className="mb-1 block font-bold">
          {role === "student" ? "Ce le-ai spune altor elevi despre SIGNals?" : "Ce le-ați spune altor profesori despre SIGNals?"}{" "}
          <span className="font-normal text-muted-foreground">(opțional)</span>
        </span>
        <Textarea value={quote} onChange={(e) => setQuote(e.target.value)} maxLength={400} className="bg-white text-lg" />
      </label>
      <label className="flex min-h-11 items-start gap-3">
        <input
          type="checkbox"
          checked={publicQuote}
          onChange={(e) => setPublicQuote(e.target.checked)}
          disabled={!quote.trim()}
          className="mt-1 size-5 shrink-0 accent-[var(--color-prof)]"
        />
        <span className={cn(!quote.trim() && "text-muted-foreground")}>
          Sunt de acord ca acest text să apară public pe pagina de testimoniale, cu prenumele și școala mea.
        </span>
      </label>
      {error ? (
        <p className="font-bold text-sem-neinteles" role="alert">
          {error}
        </p>
      ) : null}
      <Button type="submit" size="lg" disabled={state === "saving"}>
        {state === "saving" ? <Loader2 className="animate-spin" aria-hidden /> : null}
        Trimite feedback
      </Button>
    </form>
  );
}
