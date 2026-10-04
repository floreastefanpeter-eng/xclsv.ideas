import Link from "next/link";
import { Hand, Presentation } from "lucide-react";
import { Logo } from "@/components/punte/logo";
import { cn } from "@/lib/utils";

export default async function JoinPage({ params }: PageProps<"/j/[code]">) {
  const { code: raw } = await params;
  const code = raw.toUpperCase();
  const option =
    "flex min-h-28 items-center gap-4 rounded-3xl p-5 text-white shadow-md transition-transform hover:-translate-y-0.5 focus-visible:ring-4 focus-visible:ring-offset-2";
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 py-6">
      <Logo />
      <h1 className="mt-10 font-display text-4xl font-extrabold">Cine ești?</h1>
      <p className="mt-2 text-lg">
        Lecția <span className="font-mono text-xl font-black tracking-widest">{code}</span>
      </p>
      <nav className="mt-6 grid gap-4" aria-label="Alege rolul">
        <Link href={`/elev/${code}`} className={cn(option, "bg-elev focus-visible:ring-elev")}>
          <Hand className="size-10 shrink-0" aria-hidden />
          <span>
            <span className="block font-display text-2xl font-extrabold">Sunt elevul</span>
            <span className="text-lg text-white/85">Camera pentru semne și subtitrările profesorului</span>
          </span>
        </Link>
        <Link href={`/clasa/${code}`} className={cn(option, "bg-ink focus-visible:ring-ink")}>
          <Presentation className="size-10 shrink-0" aria-hidden />
          <span>
            <span className="block font-display text-2xl font-extrabold">Ecranul clasei</span>
            <span className="text-lg text-white/85">Pentru proiector, doar afișare</span>
          </span>
        </Link>
      </nav>
    </main>
  );
}
