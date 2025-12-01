
// services/predictionService.ts

import { scoutEngineService } from "./scoutEngineService";
import { fusionEngineService } from "./fusionEngineService";

export interface PredictionInput {
    metric: string;            // ex: "ataques", "Pace", "xG", "3PT"
    value: number;             // valor atual do dado
    timestamp?: number;
    odds?: number;             // opcional
}

export interface PredictionResult {
    metric: string;
    currentValue: number;
    projectedValue: number;
    trend: number;
    confidence: number;        // 0–1
    fusion: any;               // FusionResult
    reasoning: string;
    createdAt: number;
}

export const predictionService = {
    generatePrediction: async (input: PredictionInput): Promise<PredictionResult> => {
        try {
            const now = Date.now();

            // 1) SCOUT ENGINE — analisa o valor atual
            const scout = await scoutEngineService.processMetric(input.metric, input.value);

            // 2) TREND — tendência projetada
            const trend = Number((scout.score / 100).toFixed(2));

            // 3) PROJEÇÃO — cálculo simples (ajustável depois)
            const projectedValue = Number(
                (input.value + input.value * trend * 0.35).toFixed(2)
            );

            // 4) FUSION ENGINE — integra tudo
            const fusion = await fusionEngineService.runFusion({
                metric: input.metric,
                value: input.value,
                trend,
                odds: input.odds
            });

            // 5) CONFIANÇA FINAL
            const confidence = Math.min(1, (fusion.confidence + trend) / 2);

            // 6) Texto explicativo estilo DanielScore
            const reasoning = `
A métrica "${input.metric}" apresenta score ${scout.score}.
Trend detectada: ${trend}.
Projeção futura: ${projectedValue}.
Fusion Engine indica impacto ${fusion.impact}.
Confiança final: ${(confidence * 100).toFixed(1)}%.
            `.trim();

            return {
                metric: input.metric,
                currentValue: input.value,
                projectedValue,
                trend,
                confidence,
                fusion,
                reasoning,
                createdAt: now
            };

        } catch (err) {
            console.error("Erro no Prediction Service:", err);

            return {
                metric: input.metric,
                currentValue: input.value,
                projectedValue: input.value,
                trend: 0,
                confidence: 0,
                fusion: null,
                reasoning: "Fallback: falha ao gerar projeção.",
                createdAt: Date.now()
            };
        }
    }
};
