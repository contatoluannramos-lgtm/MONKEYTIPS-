
import { supabase } from "@/lib/supabaseClient";

export const eventsService = {

    // 🔥 Registrar evento do sistema (gol, escanteio, cartão, mudança, alerta etc)
    async pushEvent(event) {
        const { data, error } = await supabase
            .from("system_events")
            .insert([
                {
                    type: event.type,           // "GOAL" | "CARD" | "ODD_SPIKE" | "ERROR" | etc
                    sport: event.sport,         // "football" | "basketball" | "volleyball"
                    match_id: event.match_id,
                    payload: event.payload,     // JSON com o contexto
                    source: event.source || "ENGINE",
                }
            ])
            .select("*")
            .single();

        if (error) throw new Error("Erro pushEvent: " + error.message);
        return data;
    },

    // 🛰 Buscar eventos por partida
    async fetchMatchEvents(matchId) {
        const { data, error } = await supabase
            .from("system_events")
            .select("*")
            .eq("match_id", matchId)
            .order("created_at", { ascending: false });

        if (error) throw new Error("Erro fetchMatchEvents: " + error.message);
        return data;
    },

    // 📡 Buscar últimos eventos globais
    async fetchLatestEvents(limit = 100) {
        const { data, error } = await supabase
            .from("system_events")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(limit);

        if (error) throw new Error("Erro fetchLatestEvents: " + error.message);
        return data;
    },

    // 🚨 Registrar erro crítico do sistema
    async pushError(errorObj) {
        return await this.pushEvent({
            type: "ERROR",
            sport: "system",
            match_id: null,
            payload: errorObj,
            source: "SYSTEM"
        });
    },

    // 🧹 Limpeza automática de eventos
    async cleanupOldEvents(days = 5) {
        const cutoff = new Date(Date.now() - days * 86400000).toISOString();

        const { error } = await supabase
            .from("system_events")
            .delete()
            .lt("created_at", cutoff);

        if (error) throw new Error("Erro cleanupOldEvents: " + error.message);
        return true;
    }
};
