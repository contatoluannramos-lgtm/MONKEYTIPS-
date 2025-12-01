
// services/authService.ts
// Autenticação + controle de sessão (Admin Panel)

import { supabase } from "./supabaseClient";

export const authService = {
    async login(email: string, password: string) {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            return {
                success: false,
                message: "Erro ao fazer login",
                error: error.message,
            };
        }

        return {
            success: true,
            user: data.user,
        };
    },

    async logout() {
        const { error } = await supabase.auth.signOut();

        if (error) {
            return {
                success: false,
                message: "Erro ao sair",
                error: error.message,
            };
        }

        return { success: true };
    },

    async getCurrentUser() {
        const { data } = await supabase.auth.getUser();
        return data.user || null;
    },
};