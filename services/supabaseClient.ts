
import { createClient } from '@supabase/supabase-js';

// --- CONFIGURAÇÃO DO SUPABASE ---
// 1. A URL já peguei da sua imagem ✅
const SUPABASE_URL = 'https://oyzxvywjlmartftkhgch.supabase.co';

// 2. A KEY você precisa copiar da tela "anon public" e colar abaixo 👇
const SUPABASE_ANON_KEY = 'COLE_SUA_CHAVE_ANON_PUBLIC_AQUI'; 

if (SUPABASE_ANON_KEY === 'COLE_SUA_CHAVE_ANON_PUBLIC_AQUI') {
  console.warn('⚠️ AVISO: A chave do Supabase não foi configurada em services/supabaseClient.ts');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
