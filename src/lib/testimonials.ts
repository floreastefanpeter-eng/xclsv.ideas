import { createClient } from "@supabase/supabase-js";

export interface Testimonial {
  quote: string;
  author: string;
  role: "teacher" | "student" | string;
  school: string | null;
  rating: number;
  created_at: string;
}

/** Testimonialele publice (doar cele cu acordul autorului), citite cu cheia publică. */
export async function fetchTestimonials(limit = 60): Promise<Testimonial[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return [];
  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await supabase.rpc("public_testimonials");
  if (error || !Array.isArray(data)) return [];
  return (data as Testimonial[]).slice(0, limit);
}

export function roleLabel(role: string) {
  return role === "teacher" ? "Profesor" : role === "student" ? "Elev" : "Participant";
}
