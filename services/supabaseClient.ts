
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Utilitário para verificar se estamos no navegador
const isBrowser = typeof window !== 'undefined';

const getSupabaseClient = (): SupabaseClient | null => {
    if (!isBrowser) return null;

    const url = localStorage.getItem('supabase_project_url');
    const key = localStorage.getItem('supabase_anon_key');

    if (url && key && !url.includes('placeholder')) {
        try {
            return createClient(url, key);
        } catch (error) {
            console.error("Failed to create Supabase client:", error);
            return null;
        }
    }
    return null;
};

// Cria a instância uma vez e a exporta
const supabaseInstance = getSupabaseClient();

export const supabase: SupabaseClient | null = supabaseInstance;
export const isSupabaseConfigured = (): boolean => supabase !== null;
