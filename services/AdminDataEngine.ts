
// src/engines/AdminDataEngine.ts
// 🔥 Monkey Admin Data Engine
// Centraliza: stats + news + logs e envia tudo para o painel

import { liveDataService } from "../services/liveDataService";
import { scoutService } from "../services/scoutService";
import { fusionEngine } from "../services/fusionEngine";
import { newsService } from "../services/newsService";
import { systemLogsService } from "../services/systemLogsService";
import { supabaseClient } from "../services/supabaseClient";

export const AdminDataEngine = {
    /**
     * 🟦 Coleta dados brutos (stats / logs / news)
     */
    async collect() {
        try {
            const rawStats = await liveDataService.getStats();
            const rawNews = await newsService.getLatest();
            const rawLogs = await systemLogsService.getRecentLogs();

            return {
                success: true,
                rawStats,
                rawNews,
                rawLogs
            };
        } catch (err: any) {
            return {
                success: false,
                error: err?.message || "Erro ao coletar dados"
            };
        }
    },

    /**
     * 🟩 Processa stats: limpeza + Scout + Fusion
     */
    async processStats() {
        try {
            const stats = await liveDataService.getStats();

            if (!stats || stats.length === 0) {
                return { success: true, processed: [] };
            }

            const processed = [];

            for (const item of stats) {
                const scout = await scoutService.analyze(item);
                const fusion = await fusionEngine.run(scout);

                processed.push({
                    id: item.id,
                    entityName: item.entity,
                    rawData: item.raw,
                    scoutOutput: scout,
                    fusionOutput: fusion,
                    isPositive: fusion?.positivity || false,
                    impactValue: fusion?.impact_value || 0,
                    processedAt: new Date().toISOString()
                });
            }

            return {
                success: true,
                processed
            };

        } catch (err: any) {
            return {
                success: false,
                error: err?.message || "Falha ao processar stats"
            };
        }
    },

    /**
     * 🟨 Processa notícias com o Monkey News Engine
     */
    async processNews() {
        try {
            const articles = await newsService.getLatest();

            const output = [];

            for (const article of articles) {
                const classified = await newsService.classify(article);
                output.push(classified);
            }

            return {
                success: true,
                news: output
            };

        } catch (err: any) {
            return {
                success: false,
                error: err?.message || "Erro ao processar notícias"
            };
        }
    },

    /**
     * 🟪 Retorna tudo já formatado para o Admin Panel
     * usado por: AdminComponents.tsx
     */
    async getAdminDashboardData() {
        try {
            const statsProcessed = await this.processStats();
            const newsProcessed = await this.processNews();
            const logs = await systemLogsService.getRecentLogs();

            return {
                success: true,
                data: {
                    stats: statsProcessed.processed || [],
                    news: newsProcessed.news || [],
                    logs: logs || []
                }
            };
        } catch (err: any) {
            return {
                success: false,
                error: err?.message || "Erro ao montar dashboard"
            };
        }
    }
};
