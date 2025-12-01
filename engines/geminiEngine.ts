
import { Match, Tip, SportType, TicketAnalysis, ScreenAnalysisData, BotNewsPayload, NewsProcessedItem, StatProcessedItem } from "../types";
import { logger } from "../utils/logger";

// ------------------------------------------------------
// GEMINI ENGINE (MODO CASCA – v1.0)
// Preserva a API pública e assinatura, mas sem lógica real
// ------------------------------------------------------

export const geminiEngine = {
    async generateMatchAnalysis(match: Match): Promise<Partial<Tip>> {
        logger.info("GEMINI-CASCA", `generateMatchAnalysis() chamado para ${match.teamA} vs ${match.teamB}`, { matchId: match.id });

        return {
            prediction: "N/A",
            confidence: 0,
            reasoning: "Engine em modo casca. Aguarda implementação oficial do Monkey AI Engine.",
            odds: 0
        };
    },

    async processBotNews(payload: BotNewsPayload): Promise<Omit<NewsProcessedItem, 'id' | 'originalData' | 'status' | 'processedAt'>> {
        logger.info("GEMINI-CASCA", "processBotNews() chamado", { source: payload.source });

        return {
            relevanceScore: 0,
            impactLevel: "BAIXO",
            impactScore: 0,
            context: "Engine em modo casca.",
            fusionSummary: "Sem resumo disponível.",
            recommendedAction: "Nenhuma ação."
        };
    },

    async processRawStat(entity: string, rawStat: string): Promise<Omit<StatProcessedItem, 'id' | 'entityName' | 'rawData' | 'status' | 'processedAt'>> {
        logger.info("GEMINI-CASCA", "processRawStat() chamado", { entity });

        return {
            category: "TEAM_ADVANCED",
            marketFocus: "N/A",
            probability: 0,
            aiAnalysis: "Engine em modo casca."
        };
    },

    async analyzeTicketImage(base64Image: string): Promise<TicketAnalysis> {
        logger.info("GEMINI-CASCA", "analyzeTicketImage() chamado");

        return {
            isValid: false,
            extractedTeams: "N/A",
            extractedOdds: 0,
            verdict: "REJECTED",
            aiAnalysis: "Engine em modo casca.",
            suggestedAction: "Nenhuma."
        };
    },

    async analyzeScreenCapture(base64Image: string): Promise<ScreenAnalysisData> {
        logger.info("GEMINI-CASCA", "analyzeScreenCapture() chamado");

        return {
            sport: "Futebol",
            teamA: "N/A",
            teamB: "N/A",
            score: "0-0",
            time: "--",
            detectedOdds: [],
            context: "Engine em modo casca. Sem processamento visual."
        };
    }
};
