
import { supabase, isSupabaseConfigured } from "./supabaseClient";
import type { AuthError, Session, User } from "@supabase/supabase-js";

/* ============================================================================
    TIPAGEM PADRONIZADA
============================================================================ */

export interface RetornoAuth<T = any> {
    dados: T | null;
    erro: AuthError | ErroAutenticacao | null;
}

export interface ErroAutenticacao {
    mensagem: string;
    nome: string;
    status: number;
    code: string;
    __isAuthError: boolean;
}

/* ============================================================================
    ERRO PADRÃO DE CONFIGURAÇÃO
============================================================================ */

const erroConfiguracao: ErroAutenticacao = {
    mensagem: "Supabase não configurado.",
    nome: "Erro de configuração",
    status: 500,
    code: "CONFIG_ERROR",
    __isAuthError: true
};

/* ============================================================================
    MÉTODOS PRINCIPAIS
============================================================================ */

export const authService = {
    /**
     * LOGIN DO USUÁRIO
     */
    async login(email: string, senha: string): Promise<RetornoAuth> {
        if (!isSupabaseConfigured() || !supabase) {
            return { dados: null, erro: erroConfiguracao };
        }

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password: senha
        });

        return {
            dados: error ? null : data,
            erro: error ?? null
        };
    },

    /**
     * OBTÉM A SESSÃO ATUAL
     */
    async obterSessao(): Promise<RetornoAuth<Session>> {
        if (!isSupabaseConfigured() || !supabase) {
            return { dados: null, erro: erroConfiguracao };
        }

        const { data, error } = await supabase.auth.getSession();

        return {
            dados: error ? null : data.session,
            erro: error ?? null
        };
    },

    /**
     * DESLOGAR
     */
    async logout(): Promise<RetornoAuth<"OK">> {
        if (!isSupabaseConfigured() || !supabase) {
            return { dados: null, erro: erroConfiguracao };
        }

        const { error } = await supabase.auth.signOut();

        return {
            dados: error ? null : "OK",
            erro: error ?? null
        };
    },

    /* ============================================================================
        MÉTODOS ANTIGOS — Mantidos por compatibilidade
    ============================================================================ */

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
