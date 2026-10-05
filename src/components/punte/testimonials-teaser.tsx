"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { getSupabase, supabaseConfigured } from "@/lib/supabase/client";
import { roleLabel, type Testimonial } from "@/lib/testimonials";
import { cn } from "@/lib/utils";

/** Secțiunea de pe prima pagină: ultimele 2 testimoniale reale și linkul spre toate. */
export function TestimonialsTeaser() {
  const [items, setItems] = useState<Testimonial[] | null>(null);
  useEffect(() => {
    if (!supabaseConfigured()) return;
    let cancelled = false;
    getSupabase()
      .rpc("public_testimonials")
      .then(({ data }) => {
        if (!cancelled) setItems(Array.isArray(data) ? (data as Testimonial[]).slice(0, 2) : []);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section id="testimoniale" aria-labelledby="testimoniale-titlu" className="scroll-mt-20 border-t border-border">
      <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:py-20">
        <div className="reveal">
          <h2 id="testimoniale-titlu" className="text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
            Ce spun profesorii și elevii
          </h2>
          <p className="mt-3 text-ink/70">Din feedback-ul de la finalul lecțiilor, publicat doar cu acordul autorului.</p>
          <Link href="/testimoniale" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "mt-6")}>
            Toate testimonialele
            <ArrowRight aria-hidden />
          </Link>
        </div>
        {items && items.length ? (
          <ul className="reveal grid gap-8 sm:grid-cols-2">
            {items.map((t, i) => (
              <li key={i} className="border-t border-ink pt-5">
                <blockquote className="text-xl leading-snug tracking-[-0.01em]">„{t.quote}”</blockquote>
                <p className="mt-3 text-sm">
                  <span className="font-semibold">{t.author}</span>
                  <span className="text-muted-foreground">
                    {" "}
                    · {roleLabel(t.role)}
                    {t.school ? ` · ${t.school}` : ""}
                  </span>
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="reveal self-center border-t border-ink pt-5 text-lg text-ink/70">
            Primele testimoniale apar după lecțiile pilot. Profesorii și elevii le pot lăsa la finalul fiecărei lecții.
          </p>
        )}
      </div>
    </section>
  );
}
