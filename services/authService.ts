
import { supabase, isSupabaseConfigured } from './supabaseClient';
import type { ErroAutenticacao } from '../supabase/supabaseTypes';

// Erro personalizado a ser retornado quando o Supabase não estiver configurado.
const erroConfiguracao: ErroAutenticacao = {
    mensagem: 'Supabase não configurado.',
    nome: 'Erro de configuração',
    status: 500,
    code: 'CONFIG_ERROR',
    __isAuthError: true
};

export const authService = {
    // Serviço de autenticação
    async login(email: string, senha: string) {
        if (!isSupabaseConfigured() || !supabase) {
            console.warn('Tentativa de login sem configuração do Supabase!');
            return { dados: null, erro: erroConfiguracao };
        }

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password: senha
        });

        if (error) {
            return { dados: null, erro: error };
        }

        return { dados: data, erro: null };
    },

    async obterSessao() {
        if (!isSupabaseConfigured() || !supabase) {
            return { dados: null, erro: erroConfiguracao };
        }

        const { data, error } = await supabase.auth.getSession();

        if (error) {
            return { dados: null, erro: error };
        }

        return { dados: data, erro: null };
    },

    async logout() {
        if (!isSupabaseConfigured() || !supabase) {
            return { dados: null, erro: erroConfiguracao };
        }

        const { error } = await supabase.auth.signOut();

        if (error) {
            return { dados: null, erro: error };
        }

        return { dados: 'Sessão encerrada com sucesso.', erro: null };
    }
};
