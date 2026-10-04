"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2, Monitor, RefreshCw, Search, ShieldCheck, Square, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AccountMenu } from "@/components/punte/account-menu";
import { RequireAccount } from "@/components/punte/require-account";
import { Panel, StationBand } from "@/components/punte/station-band";
import { errorMessage, getSupabase } from "@/lib/supabase/client";
import type { Profile, ProfileRole } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Overview {
  teachers: number;
  students: number;
  admins: number;
  lessons_active: number;
  lessons_ended: number;
  messages: number;
  signs: number;
  feedback: number;
  avg_rating: number | null;
  avg_understood: number | null;
}
interface UserRow {
  id: string;
  email: string | null;
  role: ProfileRole;
  display_name: string;
  school: string | null;
  language: string;
  demo: boolean;
  created_at: string;
  last_sign_in_at: string | null;
  lessons: number;
}
interface LessonRow {
  id: string;
  code: string;
  subject: string;
  title: string;
  status: "active" | "ended";
  student_name: string;
  teacher_name: string;
  created_at: string;
  ended_at: string | null;
  messages: number;
  has_summary: boolean;
}
interface FeedbackRow {
  lesson_title: string;
  lesson_code: string;
  role: string;
  display_name: string;
  rating: number;
  understood: number | null;
  comment: string | null;
  created_at: string;
}

type Tab = "users" | "lessons" | "feedback";

const ROLE_LABEL: Record<ProfileRole, string> = { teacher: "Profesor", student: "Elev", admin: "Administrator" };

function when(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("ro-RO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

async function rpc<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await getSupabase().rpc(fn, args);
  if (error) throw error;
  return data as T;
}

const th = "px-3 py-2.5 text-left text-sm font-bold text-muted-foreground";
const td = "px-3 py-2.5 align-middle";

function AdminPanel({ profile }: { profile: Profile }) {
  const [tab, setTab] = useState<Tab>("users");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [users, setUsers] = useState<UserRow[] | null>(null);
  const [lessons, setLessons] = useState<LessonRow[] | null>(null);
  const [feedback, setFeedback] = useState<FeedbackRow[] | null>(null);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [o, u, l, f] = await Promise.all([
        rpc<Overview>("admin_overview"),
        rpc<UserRow[]>("admin_users"),
        rpc<LessonRow[]>("admin_lessons"),
        rpc<FeedbackRow[]>("admin_feedback"),
      ]);
      setOverview(o);
      setUsers(u);
      setLessons(l);
      setFeedback(f);
    } catch (e) {
      toast.error(`Nu am putut încărca datele: ${errorMessage(e)}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, [load]);

  const act = async (key: string, run: () => Promise<unknown>, done: string) => {
    setBusy(key);
    try {
      await run();
      toast.success(done);
      await load();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const q = query.trim().toLowerCase();
  const shownUsers = useMemo(
    () => (users ?? []).filter((u) => !q || [u.display_name, u.email, u.school].some((v) => v?.toLowerCase().includes(q))),
    [users, q],
  );
  const shownLessons = useMemo(
    () =>
      (lessons ?? []).filter(
        (l) => !q || [l.title, l.subject, l.code, l.teacher_name, l.student_name].some((v) => v?.toLowerCase().includes(q)),
      ),
    [lessons, q],
  );

  const facts: [string, string | number][] = overview
    ? [
        ["Profesori", overview.teachers],
        ["Elevi", overview.students],
        ["Administratori", overview.admins],
        ["Lecții în desfășurare", overview.lessons_active],
        ["Lecții încheiate", overview.lessons_ended],
        ["Mesaje", overview.messages],
        ["Semne trimise", overview.signs],
        ["Feedback", overview.feedback],
        ["Nota medie", overview.avg_rating ?? "—"],
        ["Cât s-a înțeles (1–5)", overview.avg_understood ?? "—"],
      ]
    : [];

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "users", label: "Utilizatori", count: users?.length },
    { id: "lessons", label: "Lecții", count: lessons?.length },
    { id: "feedback", label: "Feedback", count: feedback?.length },
  ];

  return (
    <>
      <StationBand logoHref="/panou" right={<AccountMenu profile={profile} />}>
        <p className="flex items-center gap-2 truncate text-lg font-bold">
          <ShieldCheck className="size-5 text-prof" aria-hidden />
          Administrare
        </p>
      </StationBand>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 pb-14 pt-6 sm:px-6">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <h1 className="font-display text-4xl font-semibold leading-tight sm:text-5xl">Administrare</h1>
          <Button variant="outline" className="bg-white" onClick={() => void load()} disabled={loading}>
            {loading ? <Loader2 className="animate-spin" aria-hidden /> : <RefreshCw aria-hidden />}
            Reîmprospătează
          </Button>
        </div>

        <Panel id="situatia" title="Situația platformei" className="mb-6" bodyClassName="p-0 sm:p-0">
          {overview ? (
            <dl className="grid grid-cols-2 sm:grid-cols-5">
              {facts.map(([label, value]) => (
                <div key={label} className="border-b border-r border-border px-4 py-3">
                  <dt className="text-sm text-muted-foreground">{label}</dt>
                  <dd className="code-cells text-2xl tracking-[0.04em]">{value}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="flex items-center gap-2 p-5 text-muted-foreground" role="status">
              <Loader2 className="size-5 animate-spin" aria-hidden />
              Se încarcă…
            </p>
          )}
        </Panel>

        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="flex gap-1 rounded-md bg-muted p-1" role="tablist" aria-label="Secțiuni">
            {tabs.map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "min-h-11 rounded px-4 font-bold transition-colors",
                  tab === t.id ? "bg-ink text-white" : "text-muted-foreground hover:text-ink",
                )}
              >
                {t.label}
                {t.count !== undefined ? <span className="ml-1.5 tabular opacity-70">{t.count}</span> : null}
              </button>
            ))}
          </div>
          {tab !== "feedback" ? (
            <label className="relative ml-auto w-full sm:w-72">
              <span className="sr-only">Caută</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Caută nume, email, cod…" className="h-11 bg-white pl-9" />
            </label>
          ) : null}
        </div>

        <div className="overflow-x-auto rounded-md border border-steel/80 bg-white">
          {tab === "users" ? (
            <table className="w-full min-w-[56rem] border-collapse">
              <thead className="border-b border-border bg-paper">
                <tr>
                  <th className={th}>Nume</th>
                  <th className={th}>Email</th>
                  <th className={th}>Rol</th>
                  <th className={th}>Școala</th>
                  <th className={th}>Lecții</th>
                  <th className={th}>Creat</th>
                  <th className={th}>Ultima intrare</th>
                </tr>
              </thead>
              <tbody>
                {shownUsers.map((u) => (
                  <tr key={u.id} className="border-b border-border last:border-b-0">
                    <td className={cn(td, "font-bold")}>
                      {u.display_name}
                      {u.id === profile.id ? <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-xs">tu</span> : null}
                    </td>
                    <td className={td}>
                      {u.demo ? <span className="rounded bg-warn-soft px-1.5 py-0.5 text-xs font-bold text-warn-ink">cont demo</span> : u.email ?? "—"}
                    </td>
                    <td className={td}>
                      <label className="sr-only" htmlFor={`role-${u.id}`}>
                        Rolul lui {u.display_name}
                      </label>
                      <select
                        id={`role-${u.id}`}
                        value={u.role}
                        disabled={busy === u.id}
                        onChange={(e) => {
                          const role = e.target.value as ProfileRole;
                          void act(u.id, () => rpc("admin_set_role", { p_user: u.id, p_role: role }), `${u.display_name} este acum ${ROLE_LABEL[role].toLowerCase()}.`);
                        }}
                        className={cn(
                          "h-10 rounded-md border border-input bg-white px-2 font-bold",
                          u.role === "teacher" && "text-prof-dark",
                          u.role === "student" && "text-elev-dark",
                        )}
                      >
                        {(Object.keys(ROLE_LABEL) as ProfileRole[]).map((r) => (
                          <option key={r} value={r}>
                            {ROLE_LABEL[r]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className={td}>{u.school ?? "—"}</td>
                    <td className={cn(td, "tabular")}>{u.lessons}</td>
                    <td className={cn(td, "tabular text-sm")}>{when(u.created_at)}</td>
                    <td className={cn(td, "tabular text-sm")}>{when(u.last_sign_in_at)}</td>
                  </tr>
                ))}
                {users && !shownUsers.length ? (
                  <tr>
                    <td colSpan={7} className="p-5 text-muted-foreground">
                      Niciun utilizator nu se potrivește căutării.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          ) : tab === "lessons" ? (
            <table className="w-full min-w-[60rem] border-collapse">
              <thead className="border-b border-border bg-paper">
                <tr>
                  <th className={th}>Lecția</th>
                  <th className={th}>Cod</th>
                  <th className={th}>Profesor</th>
                  <th className={th}>Elev</th>
                  <th className={th}>Stare</th>
                  <th className={th}>Mesaje</th>
                  <th className={th}>Creată</th>
                  <th className={th}>
                    <span className="sr-only">Acțiuni</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {shownLessons.map((l) => {
                  const active = l.status === "active";
                  return (
                    <tr key={l.id} className={cn("border-b border-border last:border-b-0", active && "bg-ok-soft/40")}>
                      <td className={td}>
                        <span className="block font-bold">{l.title}</span>
                        <span className="text-sm text-muted-foreground">{l.subject}</span>
                      </td>
                      <td className={td}>
                        <span className="code-cells rounded bg-muted px-2 py-1">{l.code}</span>
                      </td>
                      <td className={td}>{l.teacher_name}</td>
                      <td className={td}>{l.student_name}</td>
                      <td className={td}>
                        <span className={cn("font-bold", active ? "text-ok-ink" : "text-muted-foreground")}>
                          {active ? "În desfășurare" : l.has_summary ? "Încheiată, cu memorie" : "Încheiată"}
                        </span>
                      </td>
                      <td className={cn(td, "tabular")}>{l.messages}</td>
                      <td className={cn(td, "tabular text-sm")}>{when(l.created_at)}</td>
                      <td className={cn(td, "whitespace-nowrap text-right")}>
                        <Link href={`/clasa/${l.code}`} className={cn(buttonVariants({ size: "sm", variant: "outline" }), "bg-white")} aria-label={`Ecranul clasei pentru ${l.title}`}>
                          <Monitor aria-hidden />
                        </Link>
                        {active ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="ml-1.5 bg-white"
                            disabled={busy === l.id}
                            onClick={() => act(l.id, () => rpc("admin_end_lesson", { p_lesson: l.id }), `Lecția „${l.title}” a fost încheiată.`)}
                          >
                            <Square aria-hidden />
                            Încheie
                          </Button>
                        ) : null}
                        <Button
                          size="sm"
                          variant="destructive"
                          className="ml-1.5"
                          disabled={busy === l.id}
                          aria-label={`Șterge lecția ${l.title}`}
                          onClick={() => {
                            if (!window.confirm(`Ștergi definitiv lecția „${l.title}” (${l.code}), cu toate mesajele ei? Nu se poate anula.`)) return;
                            void act(l.id, () => rpc("admin_delete_lesson", { p_lesson: l.id }), `Lecția „${l.title}” a fost ștearsă.`);
                          }}
                        >
                          <Trash2 aria-hidden />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
                {lessons && !shownLessons.length ? (
                  <tr>
                    <td colSpan={8} className="p-5 text-muted-foreground">
                      Nicio lecție nu se potrivește căutării.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          ) : (
            <table className="w-full min-w-[48rem] border-collapse">
              <thead className="border-b border-border bg-paper">
                <tr>
                  <th className={th}>Lecția</th>
                  <th className={th}>Cine</th>
                  <th className={th}>Nota</th>
                  <th className={th}>A înțeles</th>
                  <th className={th}>Comentariu</th>
                  <th className={th}>Când</th>
                </tr>
              </thead>
              <tbody>
                {(feedback ?? []).map((f, i) => (
                  <tr key={i} className="border-b border-border last:border-b-0">
                    <td className={td}>
                      <span className="block font-bold">{f.lesson_title}</span>
                      <span className="code-cells text-sm text-muted-foreground">{f.lesson_code}</span>
                    </td>
                    <td className={td}>
                      {f.display_name} <span className="text-sm text-muted-foreground">({f.role === "teacher" ? "profesor" : f.role === "student" ? "elev" : f.role})</span>
                    </td>
                    <td className={cn(td, "tabular font-bold")}>{f.rating}/5</td>
                    <td className={cn(td, "tabular")}>{f.understood ? `${f.understood}/5` : "—"}</td>
                    <td className={cn(td, "max-w-md")}>{f.comment || <span className="text-muted-foreground">—</span>}</td>
                    <td className={cn(td, "tabular text-sm")}>{when(f.created_at)}</td>
                  </tr>
                ))}
                {feedback && !feedback.length ? (
                  <tr>
                    <td colSpan={6} className="p-5 text-muted-foreground">
                      Încă nu există feedback.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </>
  );
}

export default function AdminScreen() {
  return <RequireAccount role="admin">{(profile) => <AdminPanel profile={profile} />}</RequireAccount>;
}
