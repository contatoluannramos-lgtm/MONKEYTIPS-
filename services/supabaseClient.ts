import { createClient } from '@supabase/supabase-js';

// Utilitário para verificar se estamos no navegador
const isBrowser = typeof window !== 'undefined';

// Tenta ler do LocalStorage apenas se estiver no navegador
const storedUrl = isBrowser ? localStorage.getItem('supabase_project_url') : null;
const storedKey = isBrowser ? localStorage.getItem('supabase_anon_key') : null;

// Default fallback seguro para evitar crash na inicialização do Build
const SUPABASE_URL = storedUrl || 'https://placeholder.supabase.co'; 
const SUPABASE_ANON_KEY = storedKey || 'placeholder-key'; 

export const isSupabaseConfigured = () => {
  if (!isBrowser) return false; // No servidor, assumimos não configurado via LocalStorage
  return !!storedUrl && !!storedKey;
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);