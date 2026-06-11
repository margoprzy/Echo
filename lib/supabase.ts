import { createClient } from "@supabase/supabase-js";
import { cleanEnv } from "./env";

// Re-eksport dla zgodności z istniejącymi importami (@/lib/supabase).
export { cleanEnv };

export const supabase = createClient(
  cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_URL),
  cleanEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
);
