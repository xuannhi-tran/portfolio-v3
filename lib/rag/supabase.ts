import { createClient } from "@supabase/supabase-js";

/** Server-only client with the secret key. Never import this from a client component. */
export function supabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SECRET_KEY must be set");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export type Match = { id: string; source: string; title: string; heading: string; text: string; skills: string[]; similarity: number };
