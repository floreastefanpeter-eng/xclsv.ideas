import Link from "next/link";
import { GraduationCap, Hand, Mic, Presentation, Sparkles } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { CreateLessonForm } from "@/components/punte/create-lesson-form";
import { JoinForm } from "@/components/punte/join-form";
import { Logo } from "@/components/punte/logo";
import { cn } from "@/lib/utils";

const PIECES = [
  {
    icon: Hand,
    title: "Insigna elevului",
    text: "Camera recunoaște semnele elevului. Profesorul le aude ca voce și le vede ca text.",
    color: "bg-elev",
  },
  {
    icon: Mic,
    title: "Insigna profesorului",
    text: "Vocea profesorului devine subtitrare live. Insigna se aprinde și vibrează când elevul nu a înțeles.",
    color: "bg-prof",
  },
  {
    icon: Presentation,
    title: "Ecranul clasei",
    text: "Conversația în ambele sensuri, pe tablă. La final, memoria lecției: notițe, temă, termeni noi.",
    color: "bg-ink",
  },
];

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-16 pt-5 sm:px-6">
      <header className="flex items-center justify-between gap-3">
        <Logo />
        <Link href="/elev/antrenare" className={cn(buttonVariants({ variant: "outline" }), "bg-white")}>
          <GraduationCap aria-hidden />
          Antrenează semnele
        </Link>
      </header>

      <section className="py-10 sm:py-14">
        <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-sm font-bold text-elev">
          <Sparkles className="size-4" aria-hidden />
          Kitul clasei pentru elevii surzi sau hipoacuzici
        </p>
        <h1 className="max-w-3xl font-display text-5xl font-extrabold leading-[1.02] tracking-tight sm:text-7xl">
          Elevul semnează.
          <br />
          <span className="text-elev">Clasa înțelege.</span>
        </h1>
        <p className="mt-5 max-w-2xl text-xl leading-relaxed text-ink/80">
          Punte mediază lecția în ambele sensuri: semnele elevului devin voce pentru profesor, vocea profesorului devine
          subtitrare pentru elev, iar AI-ul păstrează memoria lecției.
        </p>
      </section>

      <ul className="grid gap-4 sm:grid-cols-3">
        {PIECES.map(({ icon: Icon, title, text, color }) => (
          <li key={title} className="rounded-3xl bg-white p-5 shadow-sm">
            <span className={cn("mb-3 inline-flex size-12 items-center justify-center rounded-2xl text-white", color)}>
              <Icon className="size-6" aria-hidden />
            </span>
            <h2 className="font-display text-xl font-extrabold">{title}</h2>
            <p className="mt-1 text-lg text-ink/80">{text}</p>
          </li>
        ))}
      </ul>

      <div className="mt-10 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section aria-labelledby="creeaza" className="rounded-3xl border-t-8 border-prof bg-white/70 p-5 shadow-sm sm:p-7">
          <h2 id="creeaza" className="mb-1 font-display text-3xl font-extrabold">
            Creează o lecție
          </h2>
          <p className="mb-5 text-lg text-ink/75">Pentru profesor. Primești un cod și un QR pentru elev și pentru proiector.</p>
          <CreateLessonForm />
        </section>
        <section aria-labelledby="intra" className="h-fit rounded-3xl border-t-8 border-elev bg-white/70 p-5 shadow-sm sm:p-7">
          <h2 id="intra" className="mb-1 font-display text-3xl font-extrabold">
            Intră într-o lecție
          </h2>
          <p className="mb-5 text-lg text-ink/75">Pentru elev sau pentru ecranul clasei.</p>
          <JoinForm />
        </section>
      </div>

      <footer className="mt-12 text-center text-sm text-muted-foreground">
        Punte nu înregistrează video sau audio. Se salvează doar textul conversației.
      </footer>
    </main>
  );
}
