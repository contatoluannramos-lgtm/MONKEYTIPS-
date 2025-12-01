
// services/fusionEngine.ts
// Monkey Fusion Engine — combina stats + scout + odds para gerar:
// probabilidade, EV+, fusionScore e recomendação final

export interface FusionInput {
    homeAttack: number;
    awayAttack: number;
    homeDefense: number;
    awayDefense: number;
    pace: number;
    oddsHome: number;
    oddsAway: number;
    oddsDraw?: number;
}

export interface FusionResult {
    homeProb: number;
    awayProb: number;
    drawProb?: number;
    evHome: number;
    evAway: number;
    evDraw?: number;
    fusionScore: number;
    recommendation: string;
}

export const fusionEngine = {
    analyze(input: FusionInput): FusionResult {
        const {
            homeAttack,
            awayAttack,
            homeDefense,
            awayDefense,
            pace,
            oddsHome,
            oddsAway,
            oddsDraw
        } = input;

        // Probabilidades baseadas em força ofensiva, defensiva e ritmo
        const baseHome = homeAttack * 0.45 + awayDefense * 0.25 + pace * 0.30;
        const baseAway = awayAttack * 0.45 + homeDefense * 0.25 + pace * 0.30;

        let total = baseHome + baseAway;

        const homeProb = Math.round((baseHome / total) * 100);
        const awayProb = Math.round((baseAway / total) * 100);

        let drawProb;
        if (oddsDraw) {
            drawProb = Math.max(5, 100 - (homeProb + awayProb)); // Ajuste simples
        }

        // EV (Valor Esperado)
        const evHome = Number(((homeProb / 100) * oddsHome - 1).toFixed(2));
        const evAway = Number(((awayProb / 100) * oddsAway - 1).toFixed(2));
        const evDraw = oddsDraw && drawProb
            ? Number(((drawProb / 100) * oddsDraw - 1).toFixed(2))
            : undefined;

        // Fusion Score — métrica proprietária
        const fusionScore = Math.round(
            (homeProb - awayProb) * 0.6 +
            (pace * 0.25) +
            ((evHome - evAway) * 10)
        );

        // Recomendação automática
        let recommendation = "NO BET";

        if (evHome > 0 && homeProb >= 55) recommendation = "HOME — EV+";
        else if (evAway > 0 && awayProb >= 55) recommendation = "AWAY — EV+";
        else if (evDraw && evDraw > 0 && drawProb! >= 25) recommendation = "DRAW — EV+";

        return {
            homeProb,
            awayProb,
            drawProb,
            evHome,
            evAway,
            evDraw,
            fusionScore,
            recommendation
        };
    }
};