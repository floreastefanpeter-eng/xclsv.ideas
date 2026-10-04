"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { TriangleAlert } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { LoadingScreen } from "@/components/punte/screen-state";
import { useAuth } from "@/hooks/use-auth";
import type { Profile, ProfileRole } from "@/lib/types";
import { cn } from "@/lib/utils";

const ROLE_LABEL: Record<ProfileRole, string> = { teacher: "profesor", student: "elev", admin: "administrator" };

/**
 * Ecranele profesorului și ale elevului cer un cont. Fără cont: înapoi la autentificare,
 * cu întoarcere automată aici după intrare.
 */
export function RequireAccount({
  role,
  children,
}: {
  role?: ProfileRole;
  children: (profile: Profile, updateProfile: ReturnType<typeof useAuth>["updateProfile"]) => React.ReactNode;
}) {
  const { state, updateProfile } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const needsLogin = state.status === "signed-out" || state.status === "guest";

  useEffect(() => {
    if (needsLogin) router.replace(`/?next=${encodeURIComponent(pathname)}`);
  }, [needsLogin, pathname, router]);

  if (state.status !== "signed-in") return <LoadingScreen text={needsLogin ? "Te ducem la autentificare…" : "Se verifică contul…"} />;

  if (role && state.profile.role !== role) {
    return (
      <main className="flex min-h-dvh flex-1 items-center justify-center p-6">
        <div className="max-w-md rounded-xl border-2 border-amber bg-white p-6 shadow-lg" role="alert">
          <h1 className="mb-2 flex items-center gap-2 font-display text-2xl font-extrabold">
            <TriangleAlert className="size-7 text-amber" aria-hidden />
            {role === "teacher" ? "Ecranul profesorului" : role === "admin" ? "Administrare" : "Ecranul elevului"}
          </h1>
          <p className="mb-5 text-lg">
            Ești conectat ca {ROLE_LABEL[state.profile.role]} ({state.profile.display_name}). Ecranul acesta e pentru{" "}
            {role === "teacher" ? "profesorul lecției" : role === "admin" ? "administratori" : "elev"}.
          </p>
          <Link href="/panou" className={cn(buttonVariants({ size: "lg" }), "w-full")}>
            Înapoi la panoul meu
          </Link>
        </div>
      </main>
    );
  }

  return <>{children(state.profile, updateProfile)}</>;
}
