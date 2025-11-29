
import { supabase, isSupabaseConfigured } from './supabaseClient';
import type { AuthError } from '@supabase/supabase-js';

// Custom error to be returned when Supabase is not configured.
const configError: AuthError = { 
    message: 'Supabase not configured.', 
    name: 'ConfigError',
    status: 500
};

export const authService = {
  async signIn(email: string, password: string) {
    if (!isSupabaseConfigured()) {
      return { data: { user: null, session: null }, error: configError };
    }
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  },

  async signOut() {
    if (!isSupabaseConfigured()) return { error: null };
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  async getSession() {
    if (!isSupabaseConfigured()) return { session: null, error: null };
    const { data, error } = await supabase.auth.getSession();
    return { session: data.session, error };
  },

  async getUser() {
    if (!isSupabaseConfigured()) return null;
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  }
};
