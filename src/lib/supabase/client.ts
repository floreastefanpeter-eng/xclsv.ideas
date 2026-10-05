"use client";

import { createClient, type SupabaseClient, type Session } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

/** Adresa publică (NEXT_PUBLIC_SITE_URL, de ex. https://signals.akiokun.com); local, adresa paginii. */
export function siteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "");
  if (configured) return configured;
  return typeof window !== "undefined" ? window.location.origin : "";
}

/** Variabilele Supabase sunt incluse la build (NEXT_PUBLIC_*): lipsa lor se vede, nu blochează pagina. */
export function supabaseConfigured(): boolean {
  return !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
}

export function getSupabase(): SupabaseClient {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("Lipsesc NEXT_PUBLIC_SUPABASE_URL sau NEXT_PUBLIC_SUPABASE_ANON_KEY în .env.local (local) sau în Vercel → Settings → Environment Variables, apoi un redeploy.");
  }
  client = createClient(url, key, {
    auth: { persistSession: true, autoRefreshToken: true, storageKey: "punte-auth" },
    realtime: { params: { eventsPerSecond: 20 } },
  });
  return client;
}

/** Doar crearea sesiunii anonime se face o singură dată în paralel; sesiunea curentă se citește mereu. */
let anonymousPromise: Promise<Session> | null = null;

/**
 * Sesiunea curentă: contul cu care e conectat utilizatorul sau, dacă nu există, una anonimă
 * (ecranele partajate). Se citește la fiecare apel, ca după o intrare / ieșire din cont să nu
 * folosim o sesiune veche (alt user_id, token expirat).
 */
export async function ensureSession(): Promise<Session> {
  const supabase = getSupabase();
  const { data } = await supabase.auth.getSession();
  if (data.session) return data.session;
  if (anonymousPromise) return anonymousPromise;
  anonymousPromise = (async () => {
    const { data: signed, error } = await supabase.auth.signInAnonymously();
    if (error || !signed.session) {
      const msg =
        error?.code === "anonymous_provider_disabled"
          ? "Autentificarea anonimă este oprită în Supabase (Authentication → Sign In / Providers → Allow anonymous sign-ins)."
          : `Nu m-am putut conecta la server: ${error?.message ?? "eroare necunoscută"}`;
      throw new Error(msg);
    }
    return signed.session;
  })();
  // După ce s-a terminat (cu succes sau nu), următorul apel citește din nou sesiunea curentă.
  anonymousPromise.finally(() => {
    anonymousPromise = null;
  }).catch(() => undefined);
  return anonymousPromise;
}

/** Mesajul de eroare dintr-o excepție Postgres/RPC, în română dacă e posibil. */
export function errorMessage(e: unknown): string {
  if (e && typeof e === "object" && "message" in e) return String((e as { message: unknown }).message);
  return String(e);
}
