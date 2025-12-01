
// services/scoutEngineService.ts

import { supabase } from "../lib/supabaseClient";

/**
 * 🔍 SCOUT ENGINE SERVICE
 * 
 * Responsável por:
 * - Receber estatísticas brutas (de APIs externas ou do AdminDataEngine)
 * - Normalizar dados
 * - Calcular métricas primárias (posse, ritmo, eficiência, força ofensiva, etc.)
 * - Alimentar o Monkey Fusion e o sistema de projeções
 * - Registrar histórico no supabase
 */

export interface ScoutInput {
    matchId: string;
    teamA: string;
    teamB: string;
    stats: any;
}

export interface ScoutOutput {
    matchId: string;
    teamA: string;
    teamB: string;

    // métricas principais
    pace: number;
    offensivePowerA: number;
    offensivePowerB: number;
    defenseScoreA: number;
    defenseScoreB: number;

    // outputs auxiliares
    momentum: "A" | "B" | "equilibrado";
    confidence: number;

    createdAt: string;
}

class ScoutEngineService {
    /**
     * Execução principal do Scout Engine
     */
    async run(input: ScoutInput): Promise<ScoutOutput> {
        const timestamp = new Date().toISOString();

        // ==========================
        // 1. NORMALIZAÇÃO DOS DADOS
        // ==========================
        const normalized = this.normalizeStats(input.stats);

        // ==========================
        // 2. CÁLCULOS PRINCIPAIS
        // ==========================
        const pace = this.calculatePace(normalized);
        const offensivePowerA = this.calculateOffensiveScore(normalized.teamA);
        const offensivePowerB = this.calculateOffensiveScore(normalized.teamB);
        const defenseScoreA = this.calculateDefenseScore(normalized.teamA);
        const defenseScoreB = this.calculateDefenseScore(normalized.teamB);

        const momentum = this.calculateMomentum(
            offensivePowerA,
            offensivePowerB,
            defenseScoreA,
            defenseScoreB
        );

        const confidence = this.calculateConfidence(pace, offensivePowerA, offensivePowerB);

        // pacotes finais
        const output: ScoutOutput = {
            matchId: input.matchId,
            teamA: input.teamA,
            teamB: input.teamB,
            pace,
            offensivePowerA,
            offensivePowerB,
            defenseScoreA,
            defenseScoreB,
            momentum,
            confidence,
            createdAt: timestamp,
        };

        // ==========================
        // 3. SALVAR NO SUPABASE
        // ==========================
        await supabase.from("scout_history").insert(output);

        return output;
    }

    // ==========================================
    // NORMALIZAÇÃO DE ESTATÍSTICAS
    // ==========================================
    normalizeStats(stats: any) {
        return {
            teamA: {
                shots: stats.teamA?.shots ?? 0,
                shotsOnTarget: stats.teamA?.shotsOnTarget ?? 0,
                possession: stats.teamA?.possession ?? 50,
                attacks: stats.teamA?.attacks ?? 0,
                dangerousAttacks: stats.teamA?.dangerousAttacks ?? 0,
            },
            teamB: {
                shots: stats.teamB?.shots ?? 0,
                shotsOnTarget: stats.teamB?.shotsOnTarget ?? 0,
                possession: stats.teamB?.possession ?? 50,
                attacks: stats.teamB?.attacks ?? 0,
                dangerousAttacks: stats.teamB?.dangerousAttacks ?? 0,
            },
        };
    }

    // ==========================================
    // CÁLCULO DE RITMO (PACE)
    // ==========================================
    calculatePace(stats: any): number {
        const totalAttacks =
            stats.teamA.attacks +
            stats.teamB.attacks +
            stats.teamA.dangerousAttacks +
            stats.teamB.dangerousAttacks;

        return Math.min(100, Math.max(10, totalAttacks * 0.35));
    }

    // ==========================================
    // PODER OFENSIVO
    // ==========================================
    calculateOffensiveScore(teamStats: any): number {
        return (
            teamStats.shotsOnTarget * 2 +
            teamStats.shots * 0.5 +
            teamStats.dangerousAttacks * 0.8
        );
    }

    // ==========================================
    // PODER DEFENSIVO
    // ==========================================
    calculateDefenseScore(teamStats: any): number {
        return 100 - (teamStats.shotsOnTarget * 3 + teamStats.dangerousAttacks * 1.2);
    }

    // ==========================================
    // MOMENTUM DO JOGO
    // ==========================================
    calculateMomentum(offA: number, offB: number, defA: number, defB: number) {
        const balance = offA - offB + (defA - defB) * 0.5;

        if (balance > 10) return "A";
        if (balance < -10) return "B";
        return "equilibrado";
    }

    // ==========================================
    // NÍVEL DE CONFIANÇA
    // ==========================================
    calculateConfidence(pace: number, offA: number, offB: number): number {
        return Math.min(100, (pace + offA + offB) / 3);
    }
}

export const scoutEngineService = new ScoutEngineService();
