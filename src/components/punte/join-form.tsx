"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function JoinForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const clean = code.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (clean.length === 6) router.push(`/j/${clean}`);
      }}
      className="space-y-3"
    >
      <Label htmlFor="code" className="text-base font-bold">
        Codul lecției (6 caractere)
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
          placeholder="ABC234"
          className="h-14 bg-white text-center font-mono text-2xl font-black tracking-[0.3em] uppercase"
          aria-describedby="code-help"
        />
        <Button type="submit" size="lg" disabled={clean.length !== 6} aria-label="Intră în lecție">
          <ArrowRight aria-hidden />
          <span className="hidden sm:inline">Intră</span>
        </Button>
      </div>
      <p id="code-help" className="text-sm text-muted-foreground">
        Sau scanează codul QR afișat de profesor.
      </p>
    </form>
  );
}
