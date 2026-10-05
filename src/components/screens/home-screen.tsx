"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Menu, MonitorSmartphone, QrCode, Smartphone } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { AuthForm } from "@/components/punte/auth-form";
import { JoinForm } from "@/components/punte/join-form";
import { PipelineDemo } from "@/components/punte/pipeline-demo";
import { StationBand } from "@/components/punte/station-band";
import { useAuth } from "@/hooks/use-auth";
import { ASL_CREDIT } from "@/lib/asl/glossary";
import { supabaseConfigured } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "#flux", label: "Cum funcționează" },
  { href: "#ecran", label: "Conectează un ecran" },
  { href: "/semne", label: "Ghidul semnelor" },
  { href: "/despre", label: "Despre" },
];

const navLink =
  "relative rounded-md px-3 py-2 text-sm font-medium text-ink/70 transition-colors hover:text-ink after:absolute after:inset-x-3 after:-bottom-0.5 after:h-[2px] after:origin-left after:scale-x-0 after:bg-prof after:transition-transform after:duration-300 hover:after:scale-x-100";

/** Intrarea în SIGNals: contul întâi. Ecranele partajate (masa, clasa) intră doar cu codul. */
export default function HomeScreen({ next }: { next?: string }) {
  const { state } = useAuth();
  const router = useRouter();
  const signedIn = state.status === "signed-in";

  useEffect(() => {
    if (signedIn) router.replace(next && next.startsWith("/") && !next.startsWith("//") ? next : "/panou");
  }, [signedIn, next, router]);

  return (
    <>
      <StationBand
        right={
          <>
            <nav aria-label="Pagini" className="hidden items-center gap-1 md:flex">
              {NAV.map((n) => (
                <Link key={n.href} href={n.href} className={navLink}>
                  {n.label}
                </Link>
              ))}
            </nav>
            <Sheet>
              <SheetTrigger className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "md:hidden")} aria-label="Deschide meniul">
                <Menu aria-hidden />
              </SheetTrigger>
              <SheetContent side="right" className="w-[82%] p-6">
                <SheetTitle className="label text-muted-foreground">Meniu</SheetTitle>
                <nav aria-label="Pagini" className="mt-2 flex flex-col">
                  {NAV.map((n) => (
                    <SheetClose
                      key={n.href}
                      nativeButton={false}
                      render={<Link href={n.href} />}
                      className="flex min-h-14 items-center border-b border-border text-xl font-semibold tracking-[-0.02em]"
                    >
                      {n.label}
                    </SheetClose>
                  ))}
                </nav>
              </SheetContent>
            </Sheet>
          </>
        }
      />

      <main className="flex-1">
        {/* Primul ecran: mesajul + contul */}
        <section className="mx-auto grid w-full max-w-7xl gap-10 px-4 pb-16 pt-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_25rem] lg:gap-16 lg:pb-24 lg:pt-20">
          <div className="flex flex-col justify-center">
            <h1 className="text-[clamp(2.9rem,7.2vw,6rem)] font-semibold leading-[0.95] tracking-[-0.055em]">
              Elevul semnează.
              <br />
              <span className="text-prof">Clasa înțelege.</span>
            </h1>
            <p className="mt-6 max-w-[34rem] text-lg leading-relaxed text-ink/70 sm:text-xl">
              SIGNals e legătura dintre elevul surd și profesor: semnele devin voce, vocea devine subtitrare pe masa elevului,
              tradusă în limba lui, iar AI-ul notează termenii lecției în locul profesorului.
            </p>
            <ul className="mt-8 grid max-w-[34rem] grid-cols-3 border-y border-border text-sm">
              {[
                ["Semne → voce", "pentru profesor"],
                ["Voce → text", "pentru elev"],
                ["10 limbi", "traducere automată"],
              ].map(([a, b], i) => (
                <li key={a} className={cn("py-3", i > 0 && "border-l border-border pl-3 sm:pl-4")}>
                  <span className="block font-semibold">{a}</span>
                  <span className="text-muted-foreground">{b}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col gap-3">
            {!supabaseConfigured() ? (
              <p role="alert" className="rounded-md bg-danger-soft px-4 py-3 text-sm font-semibold text-danger-ink">
                Aplicația nu e conectată la Supabase: lipsesc NEXT_PUBLIC_SUPABASE_URL și NEXT_PUBLIC_SUPABASE_ANON_KEY.
              </p>
            ) : null}
            <section
              aria-label="Contul tău"
              className="overflow-hidden rounded-xl border border-ink/10 bg-white shadow-[0_1px_0_rgba(10,10,10,0.04),0_24px_48px_-32px_rgba(10,10,10,0.35)]"
            >
              <AuthForm next={next} />
            </section>
            <p className="px-1 text-xs text-muted-foreground">
              Imaginea camerei nu părăsește dispozitivul și nimic nu se înregistrează. Se salvează doar textul conversației.
            </p>
          </div>
        </section>

        {/* Demo-ul fluxului */}
        <div className="border-t border-border bg-paper">
          <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:py-24">
            <PipelineDemo />
          </div>
        </div>

        {/* Terminalul sesiunii */}
        <section id="ecran" aria-labelledby="ecran-titlu" className="dark-surface scroll-mt-20 bg-ink text-white">
          <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,28rem)] lg:gap-16 lg:py-24">
            <div className="reveal flex flex-col justify-center">
              <h2 id="ecran-titlu" className="text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
                Conectează un ecran
              </h2>
              <p className="mt-3 max-w-lg text-lg leading-relaxed text-white/70">
                Tableta de pe masa elevului sau proiectorul clasei intră în lecție doar cu codul. Fără cont, fără instalare.
              </p>
              {/* legătura profesor → dispozitiv, animată discret */}
              <div aria-hidden className="mt-10 flex max-w-md items-center gap-3 text-sm text-white/70">
                <span className="flex items-center gap-2">
                  <Smartphone className="size-4" />
                  Profesorul
                </span>
                <span className="relative h-px flex-1 overflow-hidden bg-white/15">
                  <span className="absolute inset-y-0 w-1/4 animate-[signal_2.4s_ease-in-out_infinite] bg-prof-line" />
                </span>
                <span className="flex items-center gap-2">
                  <MonitorSmartphone className="size-4" />
                  Masa elevului
                </span>
              </div>
              <p className="mt-4 flex items-center gap-2 text-sm text-white/55">
                <QrCode className="size-4" aria-hidden />
                Codul și QR-ul apar pe telefonul profesorului când pornește lecția.
              </p>
            </div>
            <div className="reveal rounded-xl border border-white/12 bg-white/[0.03] p-5 sm:p-6" style={{ ["--reveal-delay" as string]: "80ms" }}>
              <p className="label mb-4 flex items-center justify-between text-white/50">
                <span>Sesiune nouă</span>
                <span className="code-cells tracking-normal">SIGNals</span>
              </p>
              <JoinForm dark label="Codul lecției" />
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>
            Model de semne:{" "}
            <a href={ASL_CREDIT.modelUrl} className="font-medium text-ink underline decoration-ink/30 hover:decoration-prof" target="_blank" rel="noreferrer">
              ASL Realtime Transformer
            </a>{" "}
            (Ceyda Akın, CC BY 4.0).
          </p>
          <p className="flex gap-4">
            <Link href="/despre" className="hover:text-ink">
              Despre SIGNals
            </Link>
            <Link href="/semne" className="hover:text-ink">
              Ghidul semnelor
            </Link>
          </p>
        </div>
      </footer>
    </>
  );
}
