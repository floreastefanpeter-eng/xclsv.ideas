"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpen, Info } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { AuthForm } from "@/components/punte/auth-form";
import { JoinForm } from "@/components/punte/join-form";
import { LineDemo } from "@/components/punte/line-demo";
import { StationBand } from "@/components/punte/station-band";
import { useAuth } from "@/hooks/use-auth";
import { ASL_CREDIT } from "@/lib/asl/glossary";
import { supabaseConfigured } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

/** Intrarea în Punte: contul întâi. Ecranele partajate (masa, clasa) intră doar cu codul. */
export default function HomeScreen({ next }: { next?: string }) {
  const { state } = useAuth();
  const router = useRouter();
  const signedIn = state.status === "signed-in";

  useEffect(() => {
    if (signedIn) router.replace(next && next.startsWith("/") && !next.startsWith("//") ? next : "/panou");
  }, [signedIn, next, router]);

  const nav = cn(buttonVariants({ variant: "ghost" }), "text-white hover:bg-white/10 hover:text-white");

  return (
    <>
      <StationBand
        right={
          <nav aria-label="Pagini" className="flex items-center gap-1">
            <Link href="/semne" className={nav} aria-label="Ghidul semnelor">
              <BookOpen aria-hidden />
              <span className="hidden sm:inline">Ghidul semnelor</span>
            </Link>
            <Link href="/despre" className={nav} aria-label="Despre Punte">
              <Info aria-hidden />
              <span className="hidden sm:inline">Despre</span>
            </Link>
          </nav>
        }
      />
      <main className="mx-auto grid w-full max-w-7xl flex-1 gap-8 px-4 pb-14 pt-6 sm:px-6 lg:grid-cols-[minmax(0,27rem)_minmax(0,1fr)] lg:gap-12 lg:pt-12">
        <div className="flex flex-col gap-6 lg:order-2">
          <div>
            <h1 className="font-display text-[2.6rem] font-extrabold leading-[0.98] sm:text-6xl lg:text-7xl">
              <span className="text-prof">Elevul semnează.</span>
              <br />
              <span className="text-elev">Clasa înțelege.</span>
            </h1>
            <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink/80 sm:text-xl">
              Punte e linia dintre elevul surd și profesor: semnele devin voce, vocea devine subtitrare pe masa elevului,
              tradusă în limba lui, iar AI-ul notează termenii lecției în locul profesorului.
            </p>
          </div>
          <div className="hidden lg:block">
            <LineDemo />
          </div>
        </div>

        <div className="flex flex-col gap-5 lg:order-1">
          {!supabaseConfigured() ? (
            <p role="alert" className="rounded-md bg-danger-soft px-4 py-3 font-bold text-danger-ink">
              Aplicația nu e conectată la Supabase: lipsesc NEXT_PUBLIC_SUPABASE_URL și NEXT_PUBLIC_SUPABASE_ANON_KEY. Adaugă-le în Vercel →
              Settings → Environment Variables, apoi fă un redeploy.
            </p>
          ) : null}
          <section aria-label="Contul tău" className="overflow-hidden rounded-md border border-steel/80 bg-white">
            <AuthForm next={next} />
          </section>

          <section aria-labelledby="ecran" className="dark-surface rounded-xl bg-ink p-4 text-white sm:p-6">
            <h2 id="ecran" className="plate mb-1 text-2xl">
              Conectează un ecran
            </h2>
            <p className="mb-4 text-white/75">Tableta de pe masa elevului sau proiectorul clasei. Fără cont, doar cu codul.</p>
            <JoinForm dark label="Codul lecției" />
          </section>
        </div>

        <div className="lg:hidden">
          <LineDemo />
        </div>
      </main>
      <footer className="border-t border-border bg-white/60 px-4 py-6 text-center text-sm text-muted-foreground">
        Punte nu înregistrează video sau audio; se salvează doar textul conversației. Model de semne:{" "}
        <a href={ASL_CREDIT.modelUrl} className="font-bold text-ink underline" target="_blank" rel="noreferrer">
          ASL Realtime Transformer
        </a>{" "}
        (Ceyda Akın, CC BY 4.0).
      </footer>
    </>
  );
}
