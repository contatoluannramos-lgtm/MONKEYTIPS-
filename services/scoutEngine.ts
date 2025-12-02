
// services/scoutEngine.ts
// Monkey Scout Engine v3 — análise tática e estatística dos jogos
// Fornece ritmo, pressão, dominância e probabilidades de gol/pontos

export interface TeamStats {
    shotsOn: number;
    shotsOff: number;
    attacks: number;
    dangerousAttacks: number;
    possession: number;
    goals: number;
}

export interface MatchStats {
    home: TeamStats;
    away: TeamStats;
    minute: number;
}

export interface ScoutResult {
    pace: number; // ritmo geral do jogo
    pressureHome: number;
    pressureAway: number;
    dominance: string; // HOME / AWAY / BALANCED
    goalChanceHome: number;
    goalChanceAway: number;
}

export const scoutEngine = {
    analyze(stats: MatchStats): ScoutResult {
        const { home, away, minute } = stats;

        // Ritmo (pace)
        const pace = Math.round(
            (home.shotsOn + away.shotsOn) * 4 +
            (home.dangerousAttacks + away.dangerousAttacks) * 0.5 +
            (home.attacks + away.attacks) * 0.1
        );

        // Pressão ofensiva
        const pressureHome = Math.round(
            home.dangerousAttacks * 0.6 +
            home.shotsOn * 2 +
            home.shotsOff * 1
        );

        const pressureAway = Math.round(
            away.dangerousAttacks * 0.6 +
            away.shotsOn * 2 +
            away.shotsOff * 1
        );

        // Dominância
        let dominance = "BALANCED";
        if (pressureHome > pressureAway * 1.25) dominance = "HOME";
        if (pressureAway > pressureHome * 1.25) dominance = "AWAY";

        // Probabilidade de gol usando fórmula proprietária Monkey
        const goalChanceHome = Math.min(
            95,
            Math.round(
                pressureHome * 0.9 +
                home.possession * 0.25 +
                (minute < 20 ? -10 : 0)
            )
        );

        const goalChanceAway = Math.min(
            95,
            Math.round(
                pressureAway * 0.9 +
                away.possession * 0.25 +
                (minute < 20 ? -10 : 0)
            )
        );

        return {
            pace,
            pressureHome,
            pressureAway,
            dominance,
            goalChanceHome,
            goalChanceAway
        };
    }
};
removendo arquivo duplicado 
