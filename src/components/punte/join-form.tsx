"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/** Codul lecției: 6 casete fixe, ca pe tabela de plecări. */
export function JoinForm({
  target = (code: string) => `/j/${code}`,
  label = "Codul lecției",
  dark,
  autoFocus,
}: {
  target?: (code: string) => string;
  label?: string;
  dark?: boolean;
  autoFocus?: boolean;
}) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const clean = code.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (clean.length === 6) router.push(target(clean));
      }}
      className="flex flex-col gap-2"
    >
      <Label htmlFor="code" className={cn("text-base font-bold", dark && "text-white")}>
        {label}
      </Label>
      <div className="flex gap-2">
        <Input
          id="code"
          value={clean}
          onChange={(e) => setCode(e.target.value)}
          inputMode="text"
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          autoFocus={autoFocus}
          placeholder="ABC234"
          maxLength={6}
          className={cn(
            "code-cells h-14 min-w-0 flex-1 text-center text-3xl uppercase placeholder:font-bold",
            dark ? "border-white/25 bg-ink-2 text-white placeholder:text-white/45" : "bg-white placeholder:text-ink/40",
          )}
          aria-describedby="code-help"
        />
        <Button type="submit" size="lg" disabled={clean.length !== 6} aria-label="Intră în lecție" className="h-14 px-5">
          <ArrowRight aria-hidden />
          <span className="hidden sm:inline">Intră</span>
        </Button>
      </div>
      <p id="code-help" className={cn("text-sm", dark ? "text-white/65" : "text-muted-foreground")}>
        6 caractere, fără 0, O, 1 sau I. Sau scanează codul QR al profesorului.
      </p>
    </form>
  );
}
