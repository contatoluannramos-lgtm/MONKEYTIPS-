
// ======================================================================
// 🐒 Monkey Tips — SCOUT SERVICE (MODO CASCA)
// Arquivo de compatibilidade. Toda a lógica real agora está em /motores/scoutEngine.ts
// ======================================================================

import { ScoutEngine } from "../motores/scoutEngine";

// Tipagem mínima para evitar erro enquanto migramos tudo
export interface ScoutInput {
    matchId?: string;
    sport?: string;
    data?: any;
}

export interface ScoutOutput {
    analysis: any;
    confidence?: number;
}

class ScoutServiceCasca {
    private engine: ScoutEngine;

    constructor() {
        this.engine = new ScoutEngine();
    }

    // ========= MÉTODO PRINCIPAL =========
    async analisar(input: ScoutInput): Promise<ScoutOutput> {
        return this.engine.analisar(input);
    }

    // ========= FUNÇÕES ANTIGAS (compatibilidade) =========
    async process(input: ScoutInput) {
        return this.engine.analisar(input);
    }

    async run(input: ScoutInput) {
        return this.engine.analisar(input);
    }
}

export const scoutService = new ScoutServiceCasca();

