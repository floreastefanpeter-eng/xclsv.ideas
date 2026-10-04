"use client";

import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase/client";
import type { AccountRole, Profile } from "@/lib/types";

export type AuthState =
  | { status: "loading" }
  | { status: "signed-out" }
  /** Sesiune anonimă (ecranele partajate) sau cont fără profil. */
  | { status: "guest"; session: Session }
  | { status: "signed-in"; session: Session; profile: Profile };

async function loadProfile(session: Session): Promise<Profile | null> {
  const { data } = await getSupabase().from("profiles").select("*").eq("id", session.user.id).maybeSingle<Profile>();
  if (data) return data;
  // Conturile create înainte de profiluri: profilul se reface din metadate.
  const meta = session.user.user_metadata ?? {};
  if (session.user.is_anonymous || (meta.role !== "teacher" && meta.role !== "student")) return null;
  const { data: created } = await getSupabase()
    .from("profiles")
    .insert({
      id: session.user.id,
      role: meta.role,
      display_name: String(meta.display_name || session.user.email?.split("@")[0] || "Utilizator"),
    })
    .select()
    .single<Profile>();
  return created ?? null;
}

const AUTH_EVENT = "punte-auth-changed";

async function resolve(session: Session | null): Promise<AuthState> {
  if (!session) return { status: "signed-out" };
  // O sesiune anonimă cu profil = cont demo (creat când emailul de confirmare nu a putut pleca).
  // Fără profil = ecran partajat (masa elevului, proiectorul).
  const profile = await loadProfile(session);
  return profile ? { status: "signed-in", session, profile } : { status: "guest", session };
}

/** Sesiunea Supabase + profilul (rol, nume, limbă). */
export function useAuth() {
  const [state, setState] = useState<AuthState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    const supabase = getSupabase();
    supabase.auth.getSession().then(async ({ data }) => {
      const next = await resolve(data.session);
      if (!cancelled) setState(next);
    });
    // Profilul contului demo apare după SIGNED_IN: recitim când ni se semnalează.
    const refresh = async () => {
      const { data } = await supabase.auth.getSession();
      const next = await resolve(data.session);
      if (!cancelled) setState(next);
    };
    window.addEventListener(AUTH_EVENT, refresh);
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED") return;
      // Nu apelăm Supabase direct din callback (blochează clientul); amânăm.
      setTimeout(async () => {
        const next = await resolve(session);
        if (!cancelled) setState(next);
      }, 0);
    });
    return () => {
      cancelled = true;
      window.removeEventListener(AUTH_EVENT, refresh);
      sub.subscription.unsubscribe();
    };
  }, []);

  const updateProfile = useCallback(async (patch: Partial<Pick<Profile, "display_name" | "school" | "language">>) => {
    if (state.status !== "signed-in") return;
    const { data, error } = await getSupabase()
      .from("profiles")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", state.profile.id)
      .select()
      .single<Profile>();
    if (error) throw error;
    setState({ ...state, profile: data });
  }, [state]);

  return { state, updateProfile };
}

export async function signUp(input: {
  email: string;
  password: string;
  role: AccountRole;
  displayName: string;
  school?: string;
}) {
  const { data, error } = await getSupabase().auth.signUp({
    email: input.email.trim(),
    password: input.password,
    options: {
      data: { role: input.role, display_name: input.displayName.trim(), school: input.school?.trim() || null },
      emailRedirectTo: typeof window !== "undefined" ? `${window.location.origin}/panou` : undefined,
    },
  });
  if (error) {
    if (isEmailDeliveryError(error.code, error.message)) {
      await createDemoAccount(input);
      return { needsConfirmation: false, demo: true };
    }
    throw new Error(authError(error.code, error.message));
  }
  // Dacă proiectul cere confirmarea emailului, nu primim încă o sesiune: urmează codul din email.
  return { needsConfirmation: !data.session, demo: false };
}

/** Limita de emailuri a Supabase sau un server de email care nu răspunde. */
function isEmailDeliveryError(code: string | undefined, message: string) {
  return (
    code === "over_email_send_rate_limit" ||
    code === "email_send_rate_limit" ||
    code === "unexpected_failure" ||
    /sending (confirmation|magic link)|send email|rate limit/i.test(message)
  );
}

/**
 * Contul demo: o sesiune anonimă cu profil (rol, nume). Funcționează complet pe acest dispozitiv,
 * fără email. Pentru demo, când serverul de email Supabase a atins limita.
 */
export async function createDemoAccount(input: { role: AccountRole; displayName: string; school?: string; email?: string }) {
  const supabase = getSupabase();
  const { data } = await supabase.auth.getSession();
  let session = data.session;
  if (session && !session.user.is_anonymous) {
    await supabase.auth.signOut();
    session = null;
  }
  if (!session) {
    const { data: anon, error } = await supabase.auth.signInAnonymously();
    if (error || !anon.session) throw new Error(authError(error?.code, error?.message ?? "Nu am putut crea contul demo."));
    session = anon.session;
  }
  const { error } = await supabase.from("profiles").upsert({
    id: session.user.id,
    role: input.role,
    display_name: input.displayName.trim() || "Utilizator",
    school: input.school?.trim() || null,
  });
  if (error) throw new Error(`Nu am putut salva profilul: ${error.message}`);
  // Metadatele nu trimit email; păstrăm adresa ca să poată fi legată mai târziu.
  await supabase.auth.updateUser({ data: { role: input.role, display_name: input.displayName.trim(), demo_email: input.email ?? null } }).catch(() => undefined);
  window.dispatchEvent(new Event(AUTH_EVENT));
}

/** Codul din emailul de confirmare (în loc de link). */
export async function verifySignupCode(email: string, code: string) {
  const supabase = getSupabase();
  const token = code.replace(/\s+/g, "");
  let { error } = await supabase.auth.verifyOtp({ email: email.trim(), token, type: "signup" });
  if (error) ({ error } = await supabase.auth.verifyOtp({ email: email.trim(), token, type: "email" }));
  if (error) throw new Error(error.code === "otp_expired" ? "Codul a expirat sau nu e corect. Cere unul nou." : authError(error.code, error.message));
  window.dispatchEvent(new Event(AUTH_EVENT));
}

export async function resendSignupCode(email: string) {
  const { error } = await getSupabase().auth.resend({ type: "signup", email: email.trim() });
  if (error) throw new Error(authError(error.code, error.message));
}

export async function signIn(email: string, password: string) {
  const { error } = await getSupabase().auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw new Error(authError(error.code, error.message));
}

export async function signOut() {
  await getSupabase().auth.signOut();
}

export async function sendPasswordReset(email: string) {
  const { error } = await getSupabase().auth.resetPasswordForEmail(email.trim(), {
    redirectTo: typeof window !== "undefined" ? `${window.location.origin}/panou` : undefined,
  });
  if (error) throw new Error(authError(error.code, error.message));
}

function authError(code: string | undefined, message: string) {
  switch (code) {
    case "invalid_credentials":
      return "Emailul sau parola nu sunt corecte.";
    case "email_not_confirmed":
      return "Confirmă-ți întâi adresa de email (verifică inboxul).";
    case "user_already_exists":
    case "email_exists":
      return "Există deja un cont cu acest email. Intră în cont.";
    case "weak_password":
      return "Parola e prea slabă: folosește cel puțin 8 caractere, cu litere și cifre.";
    case "over_email_send_rate_limit":
      return "Serverul de email a atins limita pe ora aceasta. Poți folosi contul demo între timp.";
    case "over_request_rate_limit":
      return "Prea multe încercări. Așteaptă un minut și încearcă din nou.";
    case "email_address_invalid":
      return "Adresa de email nu este validă.";
    case "signup_disabled":
      return "Înregistrarea cu email este oprită în Supabase (Authentication → Providers → Email).";
    default:
      return message;
  }
}
