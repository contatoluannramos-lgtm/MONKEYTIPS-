
// services/fusionEngineService.ts

import { scoutEngineService } from "./scoutEngineService";

export interface FusionInput {
    metric: string;
    value: number;
    trend?: number;
    odds?: number;
}

export interface FusionResult {
    ev: number;
    fairOdd: number;
    confidence: number;   // 0–1
    positivity: boolean;
    impact: number;       // -100 a +100
    summary: string;
}

export const fusionEngineService = {
    runFusion: async (input: FusionInput): Promise<FusionResult> => {
        try {
            // 1) PROCESSAR PELO SCOUT ENGINE
            const scout = await scoutEngineService.processMetric(input.metric, input.value);

            // 2) ODD JUSTA (fair odds)
            const fairOdd = scout.score > 0
                ? Number((1 / (scout.score / 100)).toFixed(2))
                : 10;

            // 3) EV+ simples (odds - odd_justa)
            const ev = input.odds ? Number((input.odds - fairOdd).toFixed(2)) : 0;

            // 4) Nível de confiança baseado no score e trend
            const confidence = Math.min(
                1,
                Math.max(0, (scout.score / 100) + (input.trend ?? 0) * 0.1)
            );

            // 5) Impacto final
            const impact = Number(((scout.score * confidence) - fairOdd).toFixed(2));

            // 6) Positividade (sinal)
            const positivity = impact > 0;

            // 7) Resumo estilo DanielScore
            const summary =
                positivity
                    ? `Sinal positivo: ${input.metric} apresenta força acima do padrão. Impacto ${impact}.`
                    : `Sinal fraco: ${input.metric} abaixo do esperado. Impacto ${impact}.`;

            return {
                ev,
                fairOdd,
                confidence,
                positivity,
                impact,
                summary
            };

        } catch (err) {
            console.error("Erro no Fusion Engine:", err);
            return {
                ev: 0,
                fairOdd: 0,
                confidence: 0,
                positivity: false,
                impact: -50,
                summary: "Fallback do Fusion Engine: falha ao processar os dados."
            };
        }
    }
};

