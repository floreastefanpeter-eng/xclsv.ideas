"use client";

import { createClient, type SupabaseClient, type Session } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

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

let sessionPromise: Promise<Session> | null = null;

/** Fiecare dispozitiv primește automat un user_id prin autentificare anonimă. */
export function ensureSession(): Promise<Session> {
  if (sessionPromise) return sessionPromise;
  sessionPromise = (async () => {
    const supabase = getSupabase();
    const { data } = await supabase.auth.getSession();
    if (data.session) return data.session;
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
  sessionPromise.catch(() => {
    sessionPromise = null;
  });
  return sessionPromise;
}

/** Mesajul de eroare dintr-o excepție Postgres/RPC, în română dacă e posibil. */
export function errorMessage(e: unknown): string {
  if (e && typeof e === "object" && "message" in e) return String((e as { message: unknown }).message);
  return String(e);
}
