import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cleanEnv } from "@/lib/env";

/**
 * Klient Supabase z kluczem serwisowym (SUPABASE_SECRET_KEY) — omija RLS.
 * Używany WYŁĄCZNIE po stronie serwera, w zaufanych kontekstach, w których
 * autoryzacja została potwierdzona wcześniej (np. webhook Shopify z poprawnym HMAC).
 */
let cached: SupabaseClient | null = null;

export function supabaseAdmin(): SupabaseClient {
  if (cached) return cached;
  const url = cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const key = cleanEnv(
    process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  if (!url || !key) throw new Error("missing_supabase_secret");
  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
