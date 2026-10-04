import Link from "next/link";
import { cn } from "@/lib/utils";

/** Marca Punte: linia roșie (profesorul) și linia albastră (elevul) se întâlnesc în stația de corespondență. */
export function PunteMark({ className, outlined }: { className?: string; outlined?: boolean }) {
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true" className={cn("size-9", className)}>
      <rect x="1" y="1" width="38" height="38" rx="6" fill="#0D1626" stroke={outlined ? "#C9D1DE" : "none"} strokeWidth="2" />
      <path d="M5 29 L13 21 H20" fill="none" stroke="#D4141C" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 21 H27 L35 13" fill="none" stroke="#3F6FF0" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="20" cy="21" r="5.6" fill="#FFFFFF" stroke="#0D1626" strokeWidth="2.2" />
    </svg>
  );
}

export function Logo({ className, dark, href = "/" }: { className?: string; dark?: boolean; href?: string }) {
  return (
    <Link
      href={href}
      className={cn("inline-flex items-center gap-2.5 rounded-md", dark ? "text-white" : "text-ink", className)}
      aria-label="Punte — pagina principală"
    >
      <PunteMark outlined={dark} />
      <span className="plate text-[1.65rem] leading-none">Punte</span>
    </Link>
  );
}
