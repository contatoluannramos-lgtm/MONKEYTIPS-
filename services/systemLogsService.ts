
// src/services/systemLogsService.ts
// 🔥 System Logs Service
// Gerencia logs operacionais do Monkey Tips

import { supabaseClient } from "./supabaseClient";

export const systemLogsService = {
    /**
     * 🟦 Salva um log no Supabase (system_logs)
     */
    async addLog(message: string, metadata: any = {}) {
        try {
            const entry = {
                message,
                metadata,
                created_at: new Date().toISOString()
            };

            const { error } = await supabaseClient
                .from("system_logs")
                .insert(entry);

            if (error) throw error;

            return { success: true };
        } catch (err: any) {
            console.error("Erro ao salvar log:", err.message);
            return { success: false, error: err.message };
        }
    },

    /**
     * 🟩 Retorna logs recentes para o Admin Panel
     */
    async getRecentLogs(limit = 40) {
        try {
            const { data, error } = await supabaseClient
                .from("system_logs")
                .select("*")
                .order("created_at", { ascending: false })
                .limit(limit);

            if (error) throw error;

            return data || [];
        } catch (err: any) {
            console.error("Erro ao buscar logs:", err.message);
            return [];
        }
    },

    /**
     * 🟨 Limpa logs antigos (manutenção automática)
     */
    async purgeOldLogs(days = 3) {
        try {
            const cutoff = new Date(Date.now() - days * 86400 * 1000).toISOString();

            const { error } = await supabaseClient
                .from("system_logs")
                .delete()
                .lt("created_at", cutoff);

            if (error) throw error;

            return { success: true };
        } catch (err: any) {
            console.error("Erro ao limpar logs:", err.message);
            return { success: false, error: err.message };
        }
    }
};
