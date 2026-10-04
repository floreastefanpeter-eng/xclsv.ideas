import { cn } from "@/lib/utils";
import { Logo } from "./logo";

/**
 * Banda stației: bara de sus, bleumarin, ca indicatorul de la intrarea în metrou.
 * Stânga: marca. Centru: unde ești (lecția). Dreapta: contul / starea conexiunii.
 */
export function StationBand({
  children,
  right,
  logoHref = "/",
  className,
  sticky = true,
}: {
  children?: React.ReactNode;
  right?: React.ReactNode;
  logoHref?: string;
  className?: string;
  sticky?: boolean;
}) {
  return (
    <header className={cn("dark-surface z-40 bg-ink text-white", sticky && "sticky top-0", className)}>
      <div className="mx-auto flex min-h-16 w-full max-w-7xl items-center gap-3 px-4 py-2 sm:gap-5 sm:px-6">
        <Logo dark href={logoHref} className="shrink-0" />
        <div className="min-w-0 flex-1">{children}</div>
        {right ? <div className="flex shrink-0 items-center gap-2">{right}</div> : null}
      </div>
      {/* linia de sub bandă: roșu → albastru, cele două linii ale puntei */}
      <div aria-hidden className="flex h-1.5">
        <span className="flex-1 bg-prof" />
        <span className="flex-1 bg-elev" />
      </div>
    </header>
  );
}

/** Plăcuța de secțiune: titlul pe fond plin, majuscule condensate. */
export function Plate({
  tone = "ink",
  children,
  icon,
  className,
  as: Tag = "h2",
  id,
}: {
  tone?: "ink" | "prof" | "elev" | "amber";
  children: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
  as?: "h1" | "h2" | "h3" | "p";
  id?: string;
}) {
  const tones = {
    ink: "bg-ink text-white",
    prof: "bg-prof text-white",
    elev: "bg-elev text-white",
    amber: "bg-amber text-ink",
  } as const;
  return (
    <Tag id={id} className={cn("plate inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-lg leading-none", tones[tone], className)}>
      {icon}
      {children}
    </Tag>
  );
}

/**
 * Panoul-indicator: banda colorată de sus (ca plăcuța unei stații) lipită de conținut.
 * Înlocuiește cardurile albe „moi”.
 */
export function Panel({
  tone = "ink",
  title,
  icon,
  action,
  id,
  dark,
  className,
  bodyClassName,
  children,
}: {
  tone?: "ink" | "prof" | "elev";
  title: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  id: string;
  dark?: boolean;
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
}) {
  const strip = { ink: "bg-ink text-white", prof: "bg-prof text-white", elev: "bg-elev text-white" } as const;
  return (
    <section
      aria-labelledby={id}
      className={cn(
        "overflow-hidden rounded-md border",
        dark ? "border-white/10 bg-white/[0.05] text-white" : "border-steel/80 bg-white",
        className,
      )}
    >
      <div className={cn("flex min-h-12 items-center justify-between gap-2 px-4 py-2", dark && tone === "ink" ? "bg-ink-2 text-white" : strip[tone])}>
        <h2 id={id} className="plate flex items-center gap-2 text-xl leading-none">
          {icon}
          {title}
        </h2>
        {action}
      </div>
      <div className={cn("p-4 sm:p-5", bodyClassName)}>{children}</div>
    </section>
  );
}
