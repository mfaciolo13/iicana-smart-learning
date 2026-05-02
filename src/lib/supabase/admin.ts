import { createClient } from "@supabase/supabase-js";

// Admin client uses the secret/service role key to bypass RLS and create users.
// Requires SUPABASE_SECRET_KEY in .env.local (Supabase Dashboard → Settings → API).
export function createAdminClient() {
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error(
      "SUPABASE_SECRET_KEY not set. Add it to .env.local from Supabase Dashboard → Settings → API → Secret key."
    );
  }
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
