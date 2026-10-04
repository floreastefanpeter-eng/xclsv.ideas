"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const LENGTH = 6;

/**
 * Codul lecției: 6 căsuțe mari peste un câmp text real (accesibil, cu tastatură și lipire).
 * Starea e afișată în clar: aștept codul → gata → se conectează.
 */
export function JoinForm({
  target = (code: string) => `/j/${code}`,
  label = "Codul lecției",
  dark,
  autoFocus,
  submitLabel = "Conectează",
}: {
  target?: (code: string) => string;
  label?: string;
  dark?: boolean;
  autoFocus?: boolean;
  submitLabel?: string;
}) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [focused, setFocused] = useState(false);
  const [going, setGoing] = useState(false);
  const clean = code.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, LENGTH);
  const ready = clean.length === LENGTH;
  const state = going ? "connecting" : ready ? "ready" : "waiting";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!ready) return;
        setGoing(true);
        router.push(target(clean));
      }}
      className="flex flex-col gap-3"
    >
      <label htmlFor="code" className={cn("label", dark ? "text-white/60" : "text-muted-foreground")}>
        {label}
      </label>
      <div className="relative">
        <input
          id="code"
          value={clean}
          onChange={(e) => setCode(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          inputMode="text"
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          autoFocus={autoFocus}
          maxLength={LENGTH}
          aria-describedby="code-state code-help"
          className="absolute inset-0 z-10 size-full cursor-text opacity-0"
        />
        <div aria-hidden className="grid grid-cols-6 gap-1.5 sm:gap-2">
          {Array.from({ length: LENGTH }, (_, i) => {
            const ch = clean[i];
            const current = focused && i === Math.min(clean.length, LENGTH - 1) && !ready;
            return (
              <span
                key={i}
                className={cn(
                  "code-cells flex aspect-[4/5] items-center justify-center rounded-md border text-2xl tracking-normal transition-[border-color,background-color] duration-200 sm:text-3xl",
                  dark
                    ? cn("bg-white/[0.04] text-white", ch ? "border-white/40" : "border-white/15", current && "border-prof-line")
                    : cn("bg-white text-ink", ch ? "border-ink" : "border-border", current && "border-prof"),
                )}
              >
                {ch ?? (current ? <span className={cn("h-7 w-px animate-pulse", dark ? "bg-white/70" : "bg-ink/60")} /> : null)}
              </span>
            );
          })}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <p id="code-state" role="status" className={cn("flex flex-1 items-center gap-2 text-sm font-medium", dark ? "text-white/75" : "text-ink/75")}>
          <span
            aria-hidden
            className={cn(
              "size-2 rounded-full",
              state === "waiting" ? (dark ? "bg-white/30" : "bg-ink/25") : "bg-prof",
              state === "ready" && "animate-pulse",
            )}
          />
          {state === "connecting" ? "Se conectează…" : state === "ready" ? "Gata de conectare" : `Aștept codul · ${clean.length}/${LENGTH}`}
        </p>
        <Button type="submit" size="lg" disabled={!ready || going} className={cn("h-12 px-5", dark && "disabled:bg-white/10 disabled:text-white/40")}>
          {going ? <Loader2 className="animate-spin" aria-hidden /> : <ArrowRight aria-hidden />}
          {submitLabel}
        </Button>
      </div>
      <p id="code-help" className={cn("text-sm", dark ? "text-white/55" : "text-muted-foreground")}>
        6 caractere, fără 0, O, 1 sau I. Sau scanează codul QR de pe ecranul profesorului.
      </p>
    </form>
  );
}
