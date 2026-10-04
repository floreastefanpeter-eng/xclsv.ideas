import Link from "next/link";
import { ArrowRight, Hand, Monitor, Tablet } from "lucide-react";
import { StationBand } from "@/components/punte/station-band";
import { cn } from "@/lib/utils";

const OPTIONS = [
  {
    href: (c: string) => `/elev/${c}`,
    icon: Hand,
    title: "Sunt elevul",
    text: "Camera pentru semne, subtitrările profesorului, alertele. Cere contul de elev.",
    line: "bg-elev",
    ring: "hover:border-elev focus-visible:border-elev",
  },
  {
    href: (c: string) => `/masa/${c}`,
    icon: Tablet,
    title: "Masa elevului",
    text: "Tableta de pe bancă: tot ce spune profesorul, mare și tradus. Fără cont.",
    line: "bg-elev",
    ring: "hover:border-elev focus-visible:border-elev",
  },
  {
    href: (c: string) => `/clasa/${c}`,
    icon: Monitor,
    title: "Ecranul clasei",
    text: "Proiectorul sau tabla: conversația în ambele sensuri. Fără cont.",
    line: "bg-sem-neutru",
    ring: "hover:border-ink focus-visible:border-ink",
  },
];

/** După scanarea codului QR: ce ecran este acest dispozitiv? */
export default async function JoinPage({ params }: PageProps<"/j/[code]">) {
  const { code: raw } = await params;
  const code = raw.toUpperCase();
  return (
    <>
      <StationBand>
        <p className="truncate text-lg font-bold">
          Lecția <span className="code-cells">{code}</span>
        </p>
      </StationBand>
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-4 py-8">
        <h1 className="font-display text-4xl font-extrabold sm:text-5xl">Ce ecran e acesta?</h1>
        <p className="mt-2 text-lg text-muted-foreground">Alege o stație de pe linia lecției.</p>
        <nav aria-label="Alege ecranul" className="mt-6">
          <ol className="flex flex-col">
            {OPTIONS.map((o, i) => (
              <li key={o.title} className="grid grid-cols-[1.75rem_minmax(0,1fr)] gap-x-3">
                <span aria-hidden className="relative flex justify-center">
                  <span className={cn("absolute w-1", o.line, i === 0 ? "top-9" : "top-0", i === OPTIONS.length - 1 ? "h-9" : "bottom-0")} />
                  <span className={cn("relative z-10 mt-7 size-5 rounded-full border-4 bg-white", o.line === "bg-elev" ? "border-elev" : "border-sem-neutru")} />
                </span>
                <Link
                  href={o.href(code)}
                  className={cn(
                    "group my-1.5 flex min-h-24 items-center gap-4 rounded-xl border-2 border-border bg-white p-4 outline-none transition-colors focus-visible:ring-4 focus-visible:ring-ring/40",
                    o.ring,
                  )}
                >
                  <o.icon className="size-9 shrink-0 text-ink" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="plate block text-2xl">{o.title}</span>
                    <span className="text-muted-foreground">{o.text}</span>
                  </span>
                  <ArrowRight className="size-6 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1" aria-hidden />
                </Link>
              </li>
            ))}
          </ol>
        </nav>
      </main>
    </>
  );
}
