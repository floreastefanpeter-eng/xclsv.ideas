"use client";

import { useRouter } from "next/navigation";
import { LayoutDashboard, LogOut, ScanFace, GraduationCap } from "lucide-react";
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
export function AccountMenu({ profile, dark = true }: { profile: Profile; dark?: boolean }) {
  const router = useRouter();
  const teacher = profile.role === "teacher";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "inline-flex h-11 items-center gap-2 rounded-md pl-1 pr-2 font-bold outline-none focus-visible:ring-4 focus-visible:ring-elev-line",
          dark ? "text-white hover:bg-white/10" : "text-ink hover:bg-muted",
        )}
        aria-label={`Contul ${profile.display_name}`}
      >
        <span
          aria-hidden
          className={cn("plate flex size-9 items-center justify-center rounded-md text-base text-white", teacher ? "bg-prof" : "bg-elev")}
        >
          {initials(profile.display_name)}
        </span>
        <span className="hidden max-w-36 truncate md:inline">{profile.display_name}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="px-3 py-2 text-sm">
            <span className="block text-base font-bold text-ink">{profile.display_name}</span>
            {teacher ? "Profesor" : "Elev"}
            {profile.school ? ` · ${profile.school}` : ""}
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem className={item} onClick={() => router.push("/panou")}>
          <LayoutDashboard aria-hidden />
          Panoul meu
        </DropdownMenuItem>
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
