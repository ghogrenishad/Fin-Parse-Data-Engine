import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseClient: SupabaseClient | null = null;

export function getSupabaseConfig(): { url: string; anonKey: string; isConfigured: boolean } {
  const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
  const envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

  const localUrl = localStorage.getItem('custom_supabase_url') || envUrl;
  const localKey = localStorage.getItem('custom_supabase_anon_key') || envKey;

  return {
    url: localUrl,
    anonKey: localKey,
    isConfigured: Boolean(localUrl && localKey && localUrl.startsWith('http')),
  };
}

export function getSupabaseClient(): SupabaseClient | null {
  const config = getSupabaseConfig();
  if (!config.isConfigured) {
    return null;
  }

  if (!supabaseClient) {
    try {
      supabaseClient = createClient(config.url, config.anonKey);
    } catch (err) {
      console.warn('Failed to initialize Supabase client:', err);
      return null;
    }
  }
  return supabaseClient;
}

export function updateCustomSupabaseConfig(url: string, anonKey: string) {
  if (url) localStorage.setItem('custom_supabase_url', url.trim());
  else localStorage.removeItem('custom_supabase_url');

  if (anonKey) localStorage.setItem('custom_supabase_anon_key', anonKey.trim());
  else localStorage.removeItem('custom_supabase_anon_key');

  supabaseClient = null; // reset instance
}
