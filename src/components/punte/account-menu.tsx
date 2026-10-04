"use client";

import { useRouter } from "next/navigation";
import { LayoutDashboard, LogOut, ScanFace, GraduationCap, ShieldCheck } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut } from "@/hooks/use-auth";
import type { Profile } from "@/lib/types";
import { cn } from "@/lib/utils";

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

const item = "min-h-11 gap-2.5 px-3 text-base";

/** Meniul contului: cine e conectat, panoul, ieșirea. */
export function AccountMenu({ profile, dark = false }: { profile: Profile; dark?: boolean }) {
  const router = useRouter();
  const teacher = profile.role !== "student";
  const admin = profile.role === "admin";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "inline-flex h-11 items-center gap-2 rounded-full border border-transparent pl-1 pr-3 font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ink",
          dark ? "text-white hover:bg-white/10" : "text-ink hover:border-border hover:bg-white",
        )}
        aria-label={`Contul ${profile.display_name}`}
      >
        <span
          aria-hidden
          className={cn("flex size-9 items-center justify-center rounded-full text-sm font-semibold text-white", profile.role === "teacher" ? "bg-prof" : "bg-ink")}
        >
          {initials(profile.display_name)}
        </span>
        <span className="hidden max-w-36 truncate md:inline">{profile.display_name}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="px-3 py-2 text-sm">
            <span className="block text-base font-bold text-ink">{profile.display_name}</span>
            {admin ? "Administrator" : teacher ? "Profesor" : "Elev"}
            {profile.school ? ` · ${profile.school}` : ""}
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem className={item} onClick={() => router.push("/panou")}>
          <LayoutDashboard aria-hidden />
          Panoul meu
        </DropdownMenuItem>
        {admin ? (
          <DropdownMenuItem className={item} onClick={() => router.push("/admin")}>
            <ShieldCheck aria-hidden />
            Administrare
          </DropdownMenuItem>
        ) : null}
        {!teacher ? (
          <>
            <DropdownMenuItem className={item} onClick={() => router.push("/elev/antrenare")}>
              <GraduationCap aria-hidden />
              Dicționarul meu
            </DropdownMenuItem>
            <DropdownMenuItem className={item} onClick={() => router.push("/elev/inregistrare")}>
              <ScanFace aria-hidden />
              Fața mea (confidențialitate)
            </DropdownMenuItem>
          </>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className={item}
          variant="destructive"
          onClick={async () => {
            await signOut();
            router.replace("/");
          }}
        >
          <LogOut aria-hidden />
          Ieși din cont
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
