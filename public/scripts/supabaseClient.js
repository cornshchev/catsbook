import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./config.js";

export const hasSupabaseConfig = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

let client = null;

if (hasSupabaseConfig) {
  const { createClient } = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm");
  client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

export const supabase = client;
