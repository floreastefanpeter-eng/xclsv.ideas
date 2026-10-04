"use client";

import { Languages } from "lucide-react";
import { LANGUAGES } from "@/lib/languages";
import { cn } from "@/lib/utils";

/** Limba subtitrărilor (select nativ: cel mai bun pe telefon). */
export function LanguageSelect({
  value,
  onChange,
  id = "lang",
  dark,
  label = "Subtitrări în",
  className,
}: {
  value: string;
  onChange: (code: string) => void;
  id?: string;
  dark?: boolean;
  label?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className={cn("flex items-center gap-1.5 text-sm font-bold", dark ? "text-white/80" : "text-ink")}>
        <Languages className="size-4" aria-hidden />
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "h-11 w-full rounded-md border px-3 text-base font-bold",
          dark ? "border-white/25 bg-ink-2 text-white" : "border-input bg-white text-ink",
        )}
      >
        {LANGUAGES.map((l) => (
          <option key={l.code} value={l.code}>
            {l.code === "ro" ? l.label : `${l.native} — ${l.label}`}
          </option>
        ))}
      </select>
    </div>
  );
}
