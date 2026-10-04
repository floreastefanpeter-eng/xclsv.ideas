"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";

/**
 * Bara de navigație: albă, lipită sus; la derulare primește un blur discret și se micșorează puțin.
 * Varianta `dark` (negru) e pentru ecranele de afișare: masa elevului și proiectorul.
 */
export function StationBand({
  children,
  right,
  logoHref = "/",
  className,
  sticky = true,
  dark = false,
}: {
  children?: React.ReactNode;
  right?: React.ReactNode;
  logoHref?: string;
  className?: string;
  sticky?: boolean;
  dark?: boolean;
}) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    if (!sticky) return;
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [sticky]);

  return (
    <header
      data-scrolled={scrolled || undefined}
      className={cn(
        "z-40 border-b transition-[background-color,border-color,box-shadow] duration-300",
        sticky && "sticky top-0",
        dark
          ? "dark-surface border-white/10 bg-ink text-white"
          : cn(
              "bg-white text-ink",
              scrolled
                ? "border-border bg-white/80 shadow-[0_8px_24px_-20px_rgba(10,10,10,0.35)] backdrop-blur-md backdrop-saturate-150"
                : "border-transparent",
            ),
        className,
      )}
    >
      <div
        className={cn(
          "mx-auto flex w-full max-w-7xl items-center gap-3 px-4 transition-[min-height] duration-300 sm:gap-6 sm:px-6",
          scrolled ? "min-h-14" : "min-h-16 sm:min-h-[4.5rem]",
        )}
      >
        <Logo dark={dark} href={logoHref} />
        <div className="min-w-0 flex-1">{children}</div>
        {right ? <div className="flex shrink-0 items-center gap-1 sm:gap-2">{right}</div> : null}
      </div>
    </header>
  );
}

/** Titlu de secțiune scurt, cu o etichetă opțională (fără bandă colorată). */
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
  return (
    <Tag id={id} className={cn("plate inline-flex items-center gap-2 text-lg leading-none", tone === "prof" || tone === "amber" ? "text-prof" : "text-ink", className)}>
      {icon}
      {children}
    </Tag>
  );
}

/**
 * Secțiune cu titlu: o linie fină deasupra, titlul și acțiunea pe un rând, apoi conținutul.
 * `tone="prof"` = linia de sus roșie (zona profesorului / acțiunea principală).
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
  return (
    <section
      aria-labelledby={id}
      className={cn(
        "overflow-hidden rounded-lg border",
        dark ? "border-white/12 bg-white/[0.04] text-white" : "border-border bg-white",
        className,
      )}
    >
      <div
        className={cn(
          "flex min-h-13 items-center justify-between gap-2 border-b px-4 py-2 sm:px-5",
          dark ? "border-white/10" : "border-border",
          tone === "prof" && "shadow-[inset_0_2px_0_0_var(--color-prof)]",
        )}
      >
        <h2 id={id} className="plate flex items-center gap-2 text-[1.05rem] leading-none">
          {icon ? <span className={cn("flex", tone === "prof" ? "text-prof" : dark ? "text-white/70" : "text-ink/60")}>{icon}</span> : null}
          {title}
        </h2>
        {action}
      </div>
      <div className={cn("p-4 sm:p-5", bodyClassName)}>{children}</div>
    </section>
  );
}
