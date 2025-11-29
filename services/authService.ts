
import { supabase, isSupabaseConfigured } from './supabaseClient';

// Tipagem mínima para evitar erros
export type ErroAutenticacao = {
    mensagem: string;
    nome: string;
    status: number;
    code: string;
    __isAuthError: boolean;
};

const erroConfiguracao: ErroAutenticacao = {
    mensagem: 'Supabase não configurado.',
    nome: 'Erro de configuração',
    status: 500,
    code: 'CONFIG_ERROR',
    __isAuthError: true
};

export const authService = {
    // ===== NOVOS MÉTODOS =====
    async login(email: string, senha: string) {
        if (!isSupabaseConfigured() || !supabase) {
            return { dados: null, erro: erroConfiguracao };
        }

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password: senha
        });

        if (error) return { dados: null, erro: error };
        return { dados: data, erro: null };
    },

    async obterSessao() {
        if (!isSupabaseConfigured() || !supabase) {
            return { dados: null, erro: erroConfiguracao };
        }

        const { data, error } = await supabase.auth.getSession();
        if (error) return { dados: null, erro: error };
        return { dados: data, erro: null };
    },

    async logout() {
        if (!isSupabaseConfigured() || !supabase) {
            return { dados: null, erro: erroConfiguracao };
        }

        const { error } = await supabase.auth.signOut();
        if (error) return { dados: null, erro: error };
        return { dados: 'OK', erro: null };
    },

    // ===== MÉTODOS ANTIGOS (COMPATIBILIDADE) =====

    async signIn(email: string, senha: string) {
        return this.login(email, senha);
    },

    async getSession() {
        return this.obterSessao();
    },

    async signOut() {
        return this.logout();
    }
};
