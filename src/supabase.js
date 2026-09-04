import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://klnemjadmcuetdpulzkf.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_OhvNh6I3jjbj4vLvFNmEWQ_t0GwP5O1';

export const isSupabaseConfigured = !!supabaseAnonKey && supabaseAnonKey !== '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true
  }
});
