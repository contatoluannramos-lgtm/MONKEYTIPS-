
// authService.ts — VERSÃO CASCA

import { authEngine } from './engines/authEngine';

export const authService = {
    login: (email: string, senha: string) =>
        authEngine.login(email, senha),

    obterSessao: () =>
        authEngine.obterSessao(),

    logout: () =>
        authEngine.logout(),

    // ==== COMPATIBILIDADE LEGADA ====

    signIn: (email: string, senha: string) =>
        authEngine.login(email, senha),

    getSession: () =>
        authEngine.obterSessao(),

    signOut: () =>
        authEngine.logout()
};

