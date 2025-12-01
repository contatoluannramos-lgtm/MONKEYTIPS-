
// services/supabaseClient.ts
// ------------------------------------------------------------
// Supabase universal client (Browser + Serverless)
// Sem window, sem localStorage em ambiente serverless
// Prioriza ENV → depois localStorage (somente no browser)
// ------------------------------------------------------------

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const isBrowser = typeof window !== 'undefined';

// ------------------------------------------------------------
// 1 — Tenta criar via ENV (serverless + frontend)
// ------------------------------------------------------------
function createFromEnv(): SupabaseClient | null {
  try {
    const url =
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      process.env.SUPABASE_URL ||
      '';

    const key =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      '';

    if (!url || !key) return null;
    return createClient(url, key);
  } catch (err) {
    console.error('❌ Erro ao criar Supabase (ENV):', err);
    return null;
  }
}

// ------------------------------------------------------------
// 2 — Tenta criar via LocalStorage (somente no navegador)
// ------------------------------------------------------------
function createFromLocalStorage(): SupabaseClient | null {
  if (!isBrowser) return null;

  try {
    const url = localStorage.getItem('supabase_project_url') || '';
    const key = localStorage.getItem('supabase_anon_key') || '';

    if (!url || !key) return null;
    return createClient(url, key);
  } catch (err) {
    console.error('❌ Erro ao criar Supabase (localStorage):', err);
    return null;
  }
}

// ------------------------------------------------------------
// 3 — Instância final (ENV → fallback browser)
// ------------------------------------------------------------
const supabaseInstance =
  createFromEnv() ||
  createFromLocalStorage() ||
  null;

export const supabase: SupabaseClient | null = supabaseInstance;

// ------------------------------------------------------------
// Helper para verificar se está configurado
// ------------------------------------------------------------
export const isSupabaseConfigured = (): boolean => {
  return supabase !== null;
};
