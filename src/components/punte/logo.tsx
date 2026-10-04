import Link from "next/link";
import { cn } from "@/lib/utils";

export function PunteMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true" className={cn("size-9", className)}>
      <rect width="40" height="40" rx="11" fill="#14202B" />
      <path d="M6 27c4-9 9-13 14-13s10 4 14 13" fill="none" stroke="#1D4ED8" strokeWidth="4" strokeLinecap="round" />
      <path d="M6 27h28" stroke="#C2410C" strokeWidth="4" strokeLinecap="round" />
      <path d="M13 27v-6M20 27v-9M27 27v-6" stroke="#EEF1F4" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ className, dark }: { className?: string; dark?: boolean }) {
  return (
    <Link
      href="/"
      className={cn("inline-flex items-center gap-2.5 rounded-lg", dark ? "text-white" : "text-ink", className)}
      aria-label="Punte — pagina principală"
    >
      <PunteMark />
      <span className="font-display text-2xl font-extrabold tracking-tight">Punte</span>
    </Link>
  );
}
