import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./config.js";

export const hasSupabaseConfig = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

let client = null;

if (hasSupabaseConfig) {
  try {
    const { createClient } = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm");
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } catch (error) {
    console.error("Supabase JS Client 加载失败，已退回本地演示模式。", error);
  }
}

export const supabase = client;
