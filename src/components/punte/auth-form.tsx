"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Eye,
  EyeOff,
  GraduationCap,
  Loader2,
  MailCheck,
  Presentation,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createDemoAccount,
  resendSignupCode,
  sendPasswordReset,
  signIn,
  signUp,
  verifySignupCode,
} from "@/hooks/use-auth";
import type { AccountRole } from "@/lib/types";
import { cn } from "@/lib/utils";

const field =
  "h-12 rounded-md border-ink/15 bg-white text-base transition-[border-color,box-shadow] duration-200 hover:border-ink/30 focus-visible:border-ink focus-visible:ring-2 focus-visible:ring-ink/15";

function PasswordInput({
  id,
  value,
  onChange,
  autoComplete,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        id={id}
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        required
        minLength={6}
        className={cn(field, "pr-12")}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-md text-muted-foreground hover:text-ink"
        aria-label={show ? "Ascunde parola" : "Arată parola"}
        aria-pressed={show}
      >
        {show ? (
          <EyeOff className="size-5" aria-hidden />
        ) : (
          <Eye className="size-5" aria-hidden />
        )}
      </button>
    </div>
  );
}

function ErrorLine({ id, message }: { id: string; message: string | null }) {
  if (!message) return null;
  return (
    <p
      id={id}
      role="alert"
      className="rounded-md border border-prof/30 bg-danger-soft px-3 py-2 text-sm font-semibold text-danger-ink"
    >
      {message}
    </p>
  );
}

const ROLES: {
  value: AccountRole;
  title: string;
  text: string;
  icon: typeof Presentation;
}[] = [
  {
    value: "teacher",
    title: "Profesor",
    text: "Pornesc lecția, vorbesc, primesc alertele.",
    icon: Presentation,
  },
  {
    value: "student",
    title: "Elev",
    text: "Semnez și citesc subtitrările, tradus dacă vreau.",
    icon: GraduationCap,
  },
];

/** Intrarea în SIGNals: autentificare sau cont nou (profesor / elev), prin Supabase Auth. */
export function AuthForm({ next }: { next?: string }) {
  const router = useRouter();
  const [tab, setTab] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [school, setSchool] = useState("");
  const [role, setRole] = useState<AccountRole>("teacher");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmSent, setConfirmSent] = useState<string | null>(null);

  const go = () =>
    router.replace(
      next && next.startsWith("/") && !next.startsWith("//") ? next : "/panou",
    );

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signIn(email, password);
      go();
    } catch (err) {
      const message = (err as Error).message;
      if (message.startsWith("Confirmă-ți")) {
        setConfirmSent(email.trim());
        setError(null);
      } else setError(message);
      setBusy(false);
    }
  };

  const register = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim())
      return setError("Scrie-ți numele, așa cum vrei să apară în lecție.");
    if (password.length < 6)
      return setError("Parola are nevoie de cel puțin 6 caractere.");
    setBusy(true);
    setError(null);
    try {
      const { needsConfirmation, demo } = await signUp({
        email,
        password,
        role,
        displayName: name,
        school,
      });
      if (needsConfirmation) {
        setConfirmSent(email.trim());
        setBusy(false);
      } else {
        if (demo)
          toast.success("Cont demo creat pe acest dispozitiv.", {
            description: "Serverul de email a atins limita, dar poți folosi SIGNals complet.",
          });
        else toast.success(`Bun venit, ${name.trim().split(" ")[0]}!`);
        go();
      }
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  const reset = async () => {
    if (!email.trim())
      return setError(
        "Scrie emailul mai întâi, apoi apasă din nou „Am uitat parola”.",
      );
    try {
      await sendPasswordReset(email);
      toast.success("Ți-am trimis un link pentru o parolă nouă.");
    } catch (err) {
      setError((err as Error).message);
    }
  };

  if (confirmSent) {
    return (
      <ConfirmCode
        email={confirmSent}
        onDone={() => {
          toast.success("Email confirmat. Bun venit!");
          go();
        }}
        onDemo={async () => {
          await createDemoAccount({ role, displayName: name || confirmSent.split("@")[0], school, email: confirmSent });
          toast.success("Cont demo creat pe acest dispozitiv.");
          go();
        }}
        onBack={() => {
          setConfirmSent(null);
          setTab("login");
        }}
      />
    );
  }

  return (
    <div className="flex flex-col">
      <div className="border-b border-border px-4 pb-4 pt-5 sm:px-6">
        <div className="mb-4 flex items-center justify-between gap-2">
          <div role="group" aria-label="Ce vrei să faci" className="flex items-center gap-5 text-[0.95rem] font-semibold">
            {(["login", "register"] as const).map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={tab === m}
                onClick={() => {
                  setTab(m);
                  setError(null);
                }}
                className={cn(
                  "relative min-h-11 transition-colors after:absolute after:inset-x-0 after:bottom-1.5 after:h-[2px] after:bg-prof after:transition-transform after:duration-300",
                  tab === m ? "text-ink after:scale-x-100" : "text-muted-foreground after:scale-x-0 hover:text-ink",
                )}
              >
                {m === "login" ? "Am cont" : "Cont nou"}
              </button>
            ))}
          </div>
          <span className="label text-muted-foreground">Sunt</span>
        </div>
        <fieldset className="grid grid-cols-2 gap-2">
          <legend className="sr-only">Sunt</legend>
          {ROLES.map((r) => {
            const on = role === r.value;
            return (
              <label
                key={r.value}
                className={cn(
                  "relative flex cursor-pointer flex-col gap-1 rounded-lg border p-3 transition-[border-color,background-color,box-shadow] duration-200 has-focus-visible:ring-2 has-focus-visible:ring-ink/20",
                  on ? "border-ink bg-white shadow-[0_6px_18px_-14px_rgba(10,10,10,0.6)]" : "border-border bg-paper hover:border-ink/30",
                )}
              >
                <input type="radio" name="role" value={r.value} checked={on} onChange={() => setRole(r.value)} className="sr-only" />
                <span className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 font-semibold">
                    <r.icon className={cn("size-4", on ? "text-ink" : "text-muted-foreground")} aria-hidden />
                    {r.title}
                  </span>
                  <span aria-hidden className={cn("size-2 rounded-full transition-colors", on ? "bg-prof" : "bg-ink/15")} />
                </span>
                <span className="text-xs leading-snug text-muted-foreground">{r.text}</span>
              </label>
            );
          })}
        </fieldset>
      </div>

      <div className="flex flex-col gap-5 p-4 sm:p-6">
        {tab === "login" ? (
          <form
            onSubmit={login}
            className="flex flex-col gap-4"
            aria-describedby={error ? "auth-error" : undefined}
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="login-email" className="text-sm font-semibold">
                Email
              </Label>
              <Input
                id="login-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={field}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between gap-2">
                <Label htmlFor="login-password" className="text-sm font-semibold">
                  Parola
                </Label>
                <button
                  type="button"
                  onClick={reset}
                  className="min-h-11 text-sm font-medium text-ink underline decoration-ink/30 underline-offset-4 hover:decoration-prof"
                >
                  Am uitat parola
                </button>
              </div>
              <PasswordInput
                id="login-password"
                value={password}
                onChange={setPassword}
                autoComplete="current-password"
              />
            </div>
            <ErrorLine id="auth-error" message={error} />
            <Button
              type="submit"
              size="lg"
              disabled={busy}
              className={cn(
                "mt-1 w-full",
                
              )}
            >
              {busy ? <Loader2 className="animate-spin" aria-hidden /> : null}
              Intră
            </Button>
          </form>
        ) : (
          <form
            onSubmit={register}
            className="flex flex-col gap-4"
            aria-describedby={error ? "auth-error" : undefined}
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="reg-name" className="text-sm font-semibold">
                Numele tău
              </Label>
              <Input
                id="reg-name"
                autoComplete="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={field}
                placeholder={
                  role === "teacher" ? "Prof. Ioana Popescu" : "Andrei Ionescu"
                }
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="reg-email" className="text-sm font-semibold">
                Email
              </Label>
              <Input
                id="reg-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={field}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="reg-password" className="text-sm font-semibold">
                Parola{" "}
                <span className="font-normal text-muted-foreground">
                  (minim 6 caractere)
                </span>
              </Label>
              <PasswordInput
                id="reg-password"
                value={password}
                onChange={setPassword}
                autoComplete="new-password"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="reg-school" className="text-sm font-semibold">
                Școala{" "}
                <span className="font-normal text-muted-foreground">
                  (opțional)
                </span>
              </Label>
              <Input
                id="reg-school"
                autoComplete="organization"
                value={school}
                onChange={(e) => setSchool(e.target.value)}
                className={field}
              />
            </div>
            <ErrorLine id="auth-error" message={error} />
            <Button
              type="submit"
              size="lg"
              disabled={busy}
              className={cn(
                "mt-1 w-full",
                
              )}
            >
              {busy ? <Loader2 className="animate-spin" aria-hidden /> : null}
              Creează contul de {role === "teacher" ? "profesor" : "elev"}
            </Button>
            <p className="text-sm text-muted-foreground">
              Salvăm doar emailul, numele și textul lecțiilor. Video și audio nu
              părăsesc niciodată dispozitivul.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

const RESEND_SECONDS = 60;

/** Confirmarea prin cod: Supabase trimite un cod de 6 cifre în emailul de confirmare. */
function ConfirmCode({
  email,
  onDone,
  onDemo,
  onBack,
}: {
  email: string;
  onDone: () => void;
  onDemo: () => Promise<void>;
  onBack: () => void;
}) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wait, setWait] = useState(RESEND_SECONDS);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const clean = code.replace(/\D/g, "").slice(0, 8);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (clean.length < 6) return setError("Codul are 6 cifre.");
    setBusy(true);
    setError(null);
    try {
      await verifySignupCode(email, clean);
      onDone();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-6">
      <MailCheck className="size-9 text-prof" aria-hidden />
      <h2 className="text-2xl font-semibold tracking-[-0.03em]">Verifică emailul</h2>
      <p className="text-lg">
        Am trimis un cod de confirmare la <strong>{email}</strong>. Scrie-l aici (sau deschide linkul din email).
      </p>
      <form onSubmit={submit} className="flex flex-col gap-3" aria-describedby={error ? "code-error" : undefined}>
        <Label htmlFor="signup-code" className="text-sm font-semibold">
          Codul din email
        </Label>
        <Input
          id="signup-code"
          value={clean}
          onChange={(e) => setCode(e.target.value)}
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          placeholder="123456"
          className="code-cells h-14 bg-white text-center text-3xl placeholder:text-ink/40"
        />
        <ErrorLine id="code-error" message={error} />
        <Button type="submit" size="lg" disabled={busy || clean.length < 6} className="w-full">
          {busy ? <Loader2 className="animate-spin" aria-hidden /> : null}
          Confirmă contul
        </Button>
      </form>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <button
          type="button"
          disabled={wait > 0}
          onClick={async () => {
            try {
              await resendSignupCode(email);
              toast.success("Am trimis un cod nou.");
              setWait(RESEND_SECONDS);
            } catch (err) {
              setError((err as Error).message);
            }
          }}
          className="min-h-11 font-semibold text-ink underline decoration-ink/30 underline-offset-4 hover:decoration-prof disabled:text-muted-foreground disabled:no-underline"
        >
          {wait > 0 ? `Retrimite codul (${wait} s)` : "Retrimite codul"}
        </button>
        <button type="button" onClick={onBack} className="min-h-11 font-bold text-muted-foreground underline">
          Înapoi
        </button>
      </div>
      <div className="rounded-md bg-muted p-3">
        <p className="mb-2 text-sm text-ink/80">
          Emailul nu vine? Pentru demo poți intra direct; contul rămâne pe acest dispozitiv.
        </p>
        <Button
          variant="outline"
          className="w-full bg-white"
          onClick={() =>
            onDemo().catch((err) => setError((err as Error).message))
          }
        >
          Folosește contul demo acum
        </Button>
      </div>
    </div>
  );
}
