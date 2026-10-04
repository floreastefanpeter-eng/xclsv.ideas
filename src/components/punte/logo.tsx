import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

/** Marca SIGNals: cele două mâini și unda de voce dintre ele (din logo-ul oficial). */
export function SignalsMark({ className, dark }: { className?: string; dark?: boolean }) {
  // Pe fundal negru, mâna bleumarin s-ar pierde: folosim iconița aplicației (mâini albe pe pătrat).
  return dark ? (
    <Image src="/brand/signals-icon.png" alt="" width={256} height={256} className={cn("size-9 rounded-[22%]", className)} priority />
  ) : (
    <Image src="/brand/signals-mark.png" alt="" width={480} height={323} className={cn("h-8 w-auto", className)} priority />
  );
}

export function Logo({ className, dark, href = "/" }: { className?: string; dark?: boolean; href?: string }) {
  return (
    <Link
      href={href}
      className={cn("inline-flex shrink-0 items-center gap-2.5 rounded-md outline-offset-4", dark ? "text-white" : "text-ink", className)}
      aria-label="SIGNals — pagina principală"
    >
      <SignalsMark dark={dark} />
      {dark ? (
        // Wordmark-ul oficial e bleumarin; pe negru îl redăm în alb, cu aceeași scriere.
        <span className="text-[1.45rem] leading-none tracking-[-0.03em]">
          <span className="font-bold">SIGN</span>
          <span className="font-light">als</span>
        </span>
      ) : (
        <Image src="/brand/signals-wordmark.png" alt="" width={720} height={148} className="h-[1.15rem] w-auto" priority />
      )}
    </Link>
  );
}
