
// services/statsProcessor.ts
// Motor oficial de processamento de estatísticas do Monkey Tips

import { geminiService } from "./geminiService";
import { fusionEngine } from "./fusionEngine";
import { supabase } from "./supabaseClient";

export interface ProcessedStat {
    id: string;
    entityName: string;
    rawData: string;
    aiOutput: string;
    fusionOutput: any;
    isPositive: boolean;
    impactValue: number;
    processedAt: string;
}

export const statsProcessor = {
    async process(entity: string, rawStat: string): Promise<ProcessedStat> {
        const id = crypto.randomUUID();
        const timestamp = new Date().toISOString();

        // 1. Prompt AI (padrão DanielScore Monkey)
        const aiPrompt = `
Você é o Monkey Tips Engine.
Analise os dados abaixo no formato DANIELSCORE com profundidade técnica.

Entidade: ${entity}
Dados fornecidos: ${rawStat}

Retorne SEMPRE em JSON:
{
  "entity": "...",
  "clean_stat": "...",
  "positivity": true/false,
  "impact_value": number,
  "analysis": "texto curto de até 3 linhas",
  "fusion_input": {
      "metric": "...",
      "value": number
  }
}
        `;

        const aiResponse = await geminiService.ask(aiPrompt);

        // Se AI não retornou JSON, gerar algo mínimo
        const parsed = aiResponse.json || {
            entity,
            clean_stat: rawStat,
            positivity: false,
            impact_value: 0,
            analysis: "AI fallback — nenhum padrão detectado.",
            fusion_input: { metric: "unknown", value: 0 }
        };

        // 2. Processamento pelo Monkey Fusion Engine
        const fusion = await fusionEngine.run(parsed.fusion_input);

        const packaged: ProcessedStat = {
            id,
            entityName: parsed.entity,
            rawData: parsed.clean_stat,
            aiOutput: parsed.analysis,
            fusionOutput: fusion,
            isPositive: parsed.positivity,
            impactValue: parsed.impact_value,
            processedAt: timestamp
        };

        // 3. Salvar no Supabase (histórico/Audit)
        await supabase.from("stats_history").insert({
            id,
            entity: parsed.entity,
            raw_data: parsed.clean_stat,
            positivity: parsed.positivity,
            impact_value: parsed.impact_value,
            fusion_output: fusion,
            created_at: timestamp
        });

        return packaged;
    }
};
