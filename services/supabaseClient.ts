
// ======================================================================
// 🐒 Monkey Tips — Supabase Client Loader (Browser Only)
// Cria o client apenas no navegador, usando as configs salvas no painel.
// ======================================================================

import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Verificar se estamos no navegador
const isBrowser = typeof window !== "undefined" && typeof localStorage !== "undefined";

// =====================================================
// Função para criar client somente se possível
// =====================================================
const getSupabaseClient = (): SupabaseClient | null => {
  if (!isBrowser) return null;

  const url = localStorage.getItem("supabase_project_url");
  const key = localStorage.getItem("supabase_anon_key");

  // Sanitização mínima
  if (!url || !key) return null;
  if (url.includes("placeholder") || key.includes("placeholder")) return null;
  if (!url.startsWith("https://")) r
