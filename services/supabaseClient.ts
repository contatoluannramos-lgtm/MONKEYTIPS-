
import { createClient } from '@supabase/supabase-js';

// Tenta ler do LocalStorage (definido via Painel Admin) ou usa valores padrão
const storedUrl = localStorage.getItem('supabase_project_url');
const storedKey = localStorage.getItem('supabase_anon_key');

// Default fallback para evitar crash na inicialização, mas as requisições falharão se não configurar
const SUPABASE_URL = storedUrl || 'https://placeholder.supabase.co'; 
const SUPABASE_ANON_KEY = storedKey || 'placeholder-key'; 

export const isSupabaseConfigured = () => {
  return !!storedUrl && !!storedKey;
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);