import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, MessageSquareQuote, Star } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { StationBand } from "@/components/punte/station-band";
import { fetchTestimonials, roleLabel } from "@/lib/testimonials";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Testimoniale · SIGNals" };
// Testimonialele noi apar fără redeploy (pagina se reîmprospătează la un minut).
export const revalidate = 60;

/** Testimoniale reale, din feedback-ul de la finalul lecțiilor, publicate doar cu acordul autorului. */
export default async function TestimonialsPage() {
  const items = await fetchTestimonials();
  return (
    <>
      <StationBand
        right={
          <Link href="/" className={cn(buttonVariants({ variant: "ghost" }))}>
            <ArrowLeft aria-hidden />
            Înapoi
          </Link>
        }
      />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-20 pt-10 sm:px-6 sm:pt-16">
        <h1 className="text-[clamp(2.4rem,5vw,3.75rem)] font-semibold leading-[1.02] tracking-[-0.045em]">
          Ce spun <span className="text-prof">profesorii și elevii</span>
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink/70">
          Fiecare testimonial vine din feedback-ul de la finalul unei lecții reale cu SIGNals și apare aici doar dacă autorul a
          fost de acord. Nu edităm și nu inventăm nimic.
        </p>

        {items.length === 0 ? (
          <section className="mt-12 rounded-xl border border-dashed border-ink/20 p-8 text-center sm:p-12" aria-live="polite">
            <MessageSquareQuote className="mx-auto size-10 text-prof" aria-hidden />
            <h2 className="mt-4 text-2xl font-semibold tracking-[-0.03em]">Primele testimoniale vin după lecțiile pilot</h2>
            <p className="mx-auto mt-2 max-w-md text-ink/70">
              La finalul fiecărei lecții, profesorii și elevii pot lăsa câteva cuvinte și pot alege să le publice aici.
            </p>
            <Link href="/" className={cn(buttonVariants({ size: "lg" }), "mt-6")}>
              Pornește o lecție
            </Link>
          </section>
        ) : (
          <ul className="mt-12 grid gap-x-10 gap-y-8 sm:grid-cols-2">
            {items.map((t, i) => (
              <li key={i} className="reveal flex flex-col border-t border-ink pt-5" style={{ ["--reveal-delay" as string]: `${(i % 4) * 60}ms` }}>
                <p className="flex gap-0.5 text-prof" aria-label={`Nota ${t.rating} din 5`}>
                  {Array.from({ length: 5 }, (_, n) => (
                    <Star key={n} className={cn("size-4", n < t.rating ? "fill-prof" : "text-ink/20")} aria-hidden />
                  ))}
                </p>
                <blockquote className="mt-3 flex-1 text-xl leading-snug tracking-[-0.01em] text-ink">„{t.quote}”</blockquote>
                <p className="mt-4 text-sm">
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
        )}
      </main>
    </>
  );
}
