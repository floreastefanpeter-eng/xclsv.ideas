import "server-only";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

/**
 * Clientul Supabase al utilizatorului care face cererea (cheia anon + tokenul lui).
 * Respectă RLS: nu are nevoie de cheia service role.
 */
export function supabaseForToken(token: string): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Lipsesc NEXT_PUBLIC_SUPABASE_URL sau NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}

/** Autentificarea rutelor API: `Authorization: Bearer <access_token>`. */
export async function authenticate(request: Request): Promise<{ user: User; db: SupabaseClient } | Response> {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return Response.json({ error: "Autentificare necesară." }, { status: 401 });
  let db: SupabaseClient;
  try {
    db = supabaseForToken(token);
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) return Response.json({ error: "Sesiune invalidă." }, { status: 401 });
  return { user: data.user, db };
}
