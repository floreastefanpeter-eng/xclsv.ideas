"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, GraduationCap, Loader2, Monitor, Presentation, ScanFace, ShieldCheck, Tablet } from "lucide-react";
import { toast } from "sonner";
import { buttonVariants } from "@/components/ui/button";
import { AccountMenu } from "@/components/punte/account-menu";
import { CreateLessonForm } from "@/components/punte/create-lesson-form";
import { JoinForm } from "@/components/punte/join-form";
import { LanguageSelect } from "@/components/punte/language-select";
import { RequireAccount } from "@/components/punte/require-account";
import { Panel, StationBand } from "@/components/punte/station-band";
import { useRegistration } from "@/hooks/use-face-privacy";
import { useSignProfile } from "@/hooks/use-sign-profile";
import { trainedWords } from "@/lib/knn";
import { getSupabase } from "@/lib/supabase/client";
import type { Lesson, Profile } from "@/lib/types";
import { cn } from "@/lib/utils";

type Row = { role: string; joined_at: string; lesson: Pick<Lesson, "id" | "code" | "subject" | "title" | "status" | "created_at" | "student_name"> | null };

function useMyLessons(userId: string) {
  const [rows, setRows] = useState<Row[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    getSupabase()
      .from("participants")
      .select("role, joined_at, lesson:lessons(id, code, subject, title, status, created_at, student_name)")
      .eq("user_id", userId)
      .order("joined_at", { ascending: false })
      .limit(40)
      .returns<Row[]>()
      .then(({ data }) => {
        if (!cancelled) setRows((data ?? []).filter((r) => r.lesson));
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);
  return rows;
}

/** „Prof. Ioana Popescu” → „Ioana”: sărim peste titluri prescurtate. */
function firstName(name: string) {
  return name.split(/s+/).find((w) => w && !w.endsWith(".")) ?? name;
}

function day(iso: string) {
  return new Date(iso).toLocaleDateString("ro-RO", { day: "2-digit", month: "short" });
}
function hour(iso: string) {
  return new Date(iso).toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" });
}

/** Lecțiile ca stații pe linie: plin = în desfășurare, gol = încheiată. */
function LessonLine({ rows, teacher }: { rows: Row[] | null; teacher: boolean }) {
  if (rows === null)
    return (
      <p className="flex items-center gap-2 p-5 text-lg text-muted-foreground" role="status">
        <Loader2 className="size-5 animate-spin" aria-hidden />
        Se încarcă lecțiile…
      </p>
    );
  if (!rows.length)
    return (
      <p className="p-5 text-lg text-muted-foreground">
        {teacher ? "Încă nu ai pornit nicio lecție. Prima stație e la stânga." : "Încă nu ai intrat în nicio lecție. Cere codul profesorului."}
      </p>
    );
  return (
    <ol className="flex flex-col">
      {rows.map(({ lesson }, i) => {
        const l = lesson!;
        const active = l.status === "active";
        const href = teacher ? `/profesor/${l.code}` : `/elev/${l.code}`;
        const first = i === 0;
        const last = i === rows.length - 1;
        return (
          <li
            key={l.id}
            className={cn(
              "grid grid-cols-[3.6rem_1.5rem_minmax(0,1fr)] gap-x-3 border-b border-border last:border-b-0 sm:grid-cols-[4rem_1.75rem_minmax(0,1fr)_auto]",
              active && (teacher ? "bg-prof-soft" : "bg-elev-soft"),
            )}
          >
            {/* coloana fixă de timp, ca pe tabela de plecări */}
            <span className="flex flex-col items-end justify-center py-3 text-right tabular">
              <span className="code-cells text-base tracking-[0.06em]">{hour(l.created_at)}</span>
              <span className="text-xs font-bold text-muted-foreground">{day(l.created_at)}</span>
            </span>
            <span aria-hidden className="relative row-span-2 flex justify-center sm:row-span-1">
              <span
                className={cn(
                  "absolute w-1",
                  first ? "top-1/2" : "top-0",
                  last ? "bottom-1/2" : "bottom-0",
                  active ? (teacher ? "bg-prof" : "bg-elev") : "bg-steel",
                )}
              />
              <span
                className={cn(
                  "relative z-10 my-auto size-5 rounded-full border-4",
                  teacher ? "border-prof" : "border-elev",
                  active ? (teacher ? "bg-prof" : "bg-elev") : "bg-white",
                )}
              />
            </span>
            <Link href={href} className="group flex min-w-0 flex-col justify-center py-3 outline-none focus-visible:underline">
              <span className="truncate font-display text-xl font-semibold leading-tight group-hover:underline">{l.title}</span>
              <span className="truncate text-sm text-muted-foreground">
                {active ? (
                  <strong className={teacher ? "text-prof-dark" : "text-elev-dark"}>În desfășurare · </strong>
                ) : (
                  <span className="sr-only">Încheiată · </span>
                )}
                {l.subject}
                {teacher && l.student_name !== "Elevul" ? ` · ${l.student_name}` : ""}
              </span>
            </Link>
            <span className="col-start-3 flex items-center gap-2 pb-3 sm:col-start-auto sm:py-3 sm:pr-3">
              <span className="code-cells rounded bg-white px-2 py-1 text-base ring-1 ring-steel" aria-label={`Cod ${l.code.split("").join(" ")}`}>
                {l.code}
              </span>
              <Link
                href={href}
                className={cn(buttonVariants({ size: "sm", variant: active ? "default" : "outline" }), active && teacher && "bg-prof hover:bg-ink", !active && "bg-white")}
              >
                {active ? "Continuă" : "Memoria"}
                <ArrowRight aria-hidden />
              </Link>
              {teacher && active ? (
                <Link href={`/clasa/${l.code}`} className={cn(buttonVariants({ size: "sm", variant: "outline" }), "bg-white")} aria-label="Ecranul clasei">
                  <Monitor aria-hidden />
                </Link>
              ) : null}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function TeacherDashboard({ profile }: { profile: Profile }) {
  const rows = useMyLessons(profile.id);
  const mine = rows?.filter((r) => r.role === "teacher") ?? null;
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:gap-8">
      <Panel id="noua" tone="prof" className="h-fit" title="Lecție nouă" icon={<Presentation className="size-5" aria-hidden />}>
        <CreateLessonForm />
      </Panel>
      <Panel id="lectii" title="Lecțiile mele" bodyClassName="p-0 sm:p-0">
        <LessonLine rows={mine} teacher />
      </Panel>
    </div>
  );
}

function StudentDashboard({ profile, updateProfile }: { profile: Profile; updateProfile: (p: Partial<Profile>) => Promise<void> }) {
  const rows = useMyLessons(profile.id);
  const registration = useRegistration();
  const { samples, dictionary } = useSignProfile();
  const trained = trainedWords(samples).length;
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:gap-8">
      <div className="flex flex-col gap-5">
        <section aria-labelledby="intra" className="rounded-xl bg-elev p-4 text-white sm:p-6">
          <h2 id="intra" className="plate mb-1 text-3xl">
            Intră în lecție
          </h2>
          <p className="mb-4 text-white/85">Codul îl vezi pe telefonul profesorului sau pe proiector.</p>
          <JoinForm dark label="Codul lecției" target={(code) => `/elev/${code}`} autoFocus submitLabel="Intră" />
        </section>

        <Panel id="limba" tone="elev" title="Subtitrările mele">
          <p className="mb-3 text-muted-foreground">Ce spune profesorul apare în română și, dacă vrei, tradus.</p>
          <LanguageSelect
            id="profile-lang"
            label="Traduce în"
            value={profile.language}
            onChange={(language) =>
              updateProfile({ language })
                .then(() => toast.success("Limba subtitrărilor a fost salvată."))
                .catch(() => toast.error("Nu am putut salva limba. Încearcă din nou."))
            }
          />
        </Panel>

        <Panel id="statii" tone="elev" title="Stațiile mele" bodyClassName="p-0 sm:p-0">
          <ol>
            {[
              { href: "/elev/antrenare", icon: GraduationCap, title: "Dicționarul meu", text: `${trained} din ${dictionary.length} cuvinte antrenate` },
              {
                href: "/elev/inregistrare",
                icon: ScanFace,
                title: "Fața mea",
                text: registration ? "Înregistrată pe acest dispozitiv" : "Neînregistrată: colegii sunt estompați, și tu",
              },
              { href: "/semne", icon: BookOpen, title: "Ghidul semnelor", text: "Cum se face fiecare semn" },
            ].map((stop, i, all) => (
              <li key={stop.href} className="grid grid-cols-[1.75rem_minmax(0,1fr)] gap-x-3 border-b border-border pl-4 last:border-b-0">
                <span aria-hidden className="relative flex justify-center">
                  <span className={cn("absolute w-1 bg-elev", i === 0 ? "top-1/2" : "top-0", i === all.length - 1 ? "bottom-1/2" : "bottom-0")} />
                  <span className="relative z-10 my-auto size-5 rounded-full border-4 border-elev bg-white" />
                </span>
                <Link href={stop.href} className="group flex min-h-18 items-center gap-3 py-3 pr-4 outline-none focus-visible:bg-elev-soft">
                  <stop.icon className="size-6 shrink-0 text-elev" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block font-display text-xl font-semibold leading-tight group-hover:underline">{stop.title}</span>
                    <span className="text-sm text-muted-foreground">{stop.text}</span>
                  </span>
                  <ArrowRight className="size-5 shrink-0 text-elev transition-transform group-hover:translate-x-1" aria-hidden />
                </Link>
              </li>
            ))}
          </ol>
        </Panel>
      </div>

      <div className="flex flex-col gap-5">
        <Panel id="lectii" title="Lecțiile mele" bodyClassName="p-0 sm:p-0">
          <LessonLine rows={rows?.filter((r) => r.role === "student") ?? null} teacher={false} />
        </Panel>
        <aside className="dark-surface flex items-start gap-4 rounded-xl bg-ink p-4 text-white sm:p-6">
          <Tablet className="size-8 shrink-0 text-elev-line" aria-hidden />
          <p className="text-white/85">
            <strong className="text-white">Ai o tabletă pe masă?</strong> Deschide pe ea punte, apasă „Conectează un ecran” și scrie
            codul lecției. Acolo vezi, mare, tot ce spune profesorul, tradus în limba ta.
          </p>
        </aside>
      </div>
    </div>
  );
}

export default function DashboardScreen() {
  return (
    <RequireAccount>
      {(profile, updateProfile) => (
        <>
          <StationBand logoHref="/panou" right={<AccountMenu profile={profile} />}>
            <p className="hidden truncate text-lg font-bold sm:block">
              {profile.role === "admin" ? "Panoul administratorului" : profile.role === "teacher" ? "Panoul profesorului" : "Panoul elevului"}
            </p>
          </StationBand>
          <main className="mx-auto w-full max-w-7xl flex-1 px-4 pb-14 pt-6 sm:px-6 lg:pt-10">
            <h1 className="mb-6 font-display text-4xl font-semibold leading-tight sm:text-5xl">
              Bună, <span className={profile.role === "teacher" ? "text-prof" : "text-elev"}>{firstName(profile.display_name)}</span>
            </h1>
            {profile.role === "admin" ? (
              <Link
                href="/admin"
                className="dark-surface mb-6 flex min-h-16 items-center gap-3 rounded-md bg-ink px-4 py-3 text-white outline-none focus-visible:ring-4 focus-visible:ring-amber"
              >
                <ShieldCheck className="size-6 shrink-0 text-amber" aria-hidden />
                <span className="flex-1">
                  <span className="plate block text-xl">Administrare</span>
                  <span className="text-white/75">Utilizatori, lecții, feedback și statistici</span>
                </span>
                <ArrowRight className="size-5 shrink-0" aria-hidden />
              </Link>
            ) : null}
            {profile.role !== "student" ? (
              <TeacherDashboard profile={profile} />
            ) : (
              <StudentDashboard profile={profile} updateProfile={updateProfile} />
            )}
          </main>
        </>
      )}
    </RequireAccount>
  );
}
