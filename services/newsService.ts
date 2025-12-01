
import { supabase } from "@/lib/supabaseClient";

export const newsService = {

    // 🔎 Buscar notícias filtradas (esporte, relevância etc)
    async fetchNews({ sport, limit = 50 }) {
        const query = supabase
            .from("news_feed")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(limit);

        if (sport) query.eq("sport", sport);

        const { data, error } = await query;

        if (error) throw new Error("Erro ao buscar notícias: " + error.message);
        return data;
    },

    // 📰 Salvar notícia bruta coletada pelo Worker
    async saveRawNews(newsArray) {
        const { data, error } = await supabase
            .from("news_feed")
            .insert(newsArray)
            .select("*");

        if (error) throw new Error("Erro ao salvar notícia: " + error.message);
        return data;
    },

    // 🧠 Atualizar notícia classificada pelo Monkey News Engine
    async updateNewsClassification(id, { relevance, impact, category }) {
        const { data, error } = await supabase
            .from("news_feed")
            .update({
                relevance,
                impact,
                category,
                processed: true,
                processed_at: new Date().toISOString()
            })
            .eq("id", id)
            .select("*")
            .single();

        if (error) throw new Error("Erro ao atualizar classificação: " + error.message);
        return data;
    },

    // 🚀 Enviar notícia classificada para o Fusion Engine
    async pushToFusionEngine(newsItem) {
        const { data, error } = await supabase
            .from("fusion_queue")
            .insert([
                {
                    news_id: newsItem.id,
                    sport: newsItem.sport,
                    category: newsItem.category,
                    impact: newsItem.impact,
                    relevance: newsItem.relevance
                }
            ])
            .select("*")
            .single();

        if (error) throw new Error("Erro ao enviar ao Fusion Engine: " + error.message);
        return data;
    },

    // 🧹 Remover notícias antigas
    async cleanupOldNews(days = 10) {
        const cutoff = new Date(Date.now() - days * 86400000).toISOString();

        const { error } = await supabase
            .from("news_feed")
            .delete()
            .lt("created_at", cutoff);

        if (error) throw new Error("Erro ao limpar notícias antigas: " + error.message);
        return true;
    }
};
