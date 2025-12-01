
// services/authService.ts
import { supabase } from "../utils/supabaseClient";

const authService = {
    async login(email: string, password: string) {
        if (!supabase) throw new Error("Supabase não configurado.");

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) throw new Error(error.message);
        return data;
    },

    async logout() {
        if (!supabase) throw new Error("Supabase não configurado.");
        await supabase.auth.signOut();
        return true;
    },

    async getCurrentUser() {
        if (!supabase) return null;

        const { data } = await supabase.auth.getUser();
        return data.user || null;
    },

    async onAuthChange(callback: (event: string, session: any) => void) {
        if (!supabase) return;

        supabase.auth.onAuthStateChange((event, session) => {
            callback(event, session);
        });
    },

    async isLoggedIn() {
        if (!supabase) return false;

        const { data } = await supabase.auth.getSession();
        return !!data.session;
    }
};

export default authService;

