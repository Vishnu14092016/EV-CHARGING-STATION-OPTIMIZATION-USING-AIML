// Browser-safe Supabase project configuration.
// The publishable/anon key is intended for client-side use; protect data with RLS policies.
const SUPABASE_URL = "https://lrcnaiufllfjgbxxfbty.supabase.co";
const SUPABASE_KEY = "sb_publishable_FXaw92wk_o6VoAAvlNIMGA_c-TZb9Ei";
let supabaseClient = null;
if (window.supabase?.createClient && SUPABASE_URL && SUPABASE_KEY) {
  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
}
