import Link from "next/link";
import { Loader2, TriangleAlert } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function LoadingScreen({ text = "Se încarcă lecția…", dark }: { text?: string; dark?: boolean }) {
  return (
    <main className={cn("flex min-h-dvh flex-1 items-center justify-center p-6", dark && "bg-night text-white")}>
      <p className="flex items-center gap-3 text-xl font-bold" role="status">
        <Loader2 className="size-7 animate-spin" aria-hidden />
        {text}
      </p>
    </main>
  );
}

export function ErrorScreen({ message, dark }: { message: string; dark?: boolean }) {
  return (
    <main className={cn("flex min-h-dvh flex-1 items-center justify-center p-6", dark && "bg-night text-white")}>
      <div className="max-w-md rounded-xl border-2 border-sem-neinteles bg-white p-6 text-ink shadow-lg" role="alert">
        <h1 className="mb-2 flex items-center gap-2 font-display text-2xl font-semibold">
          <TriangleAlert className="size-7 text-sem-neinteles" aria-hidden />
          Nu am putut deschide lecția
        </h1>
        <p className="mb-5 text-lg">{message}</p>
        <Link href="/" className={cn(buttonVariants({ size: "lg" }), "w-full")}>
          Înapoi la pagina principală
        </Link>
      </div>
    </main>
  );
}
