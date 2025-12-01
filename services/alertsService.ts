
// services/alertsService.ts
import { supabase } from "../utils/supabaseClient";

const alertsService = {
    async getAlerts(limit = 50) {
        const { data, error } = await supabase
            .from("alerts")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(limit);

        if (error) throw new Error(error.message);
        return data || [];
    },

    async createAlert(alert: {
        type: string;
        message: string;
        game_id?: string;
        payload?: any;
        severity?: "LOW" | "MEDIUM" | "HIGH";
        source?: string; // ex: fusion, scout, pre-tips, live-engine
    }) {
        const { data, error } = await supabase
            .from("alerts")
            .insert({
                ...alert,
                created_at: new Date().toISOString(),
                status: "pending"
            })
            .select()
            .single();

        if (error) throw new Error(error.message);
        return data;
    },

    async markAsSent(id: string) {
        const { data, error } = await supabase
            .from("alerts")
            .update({ status: "sent" })
            .eq("id", id)
            .select()
            .single();

        if (error) throw new Error(error.message);
        return data;
    },

    async markAsRead(id: string) {
        const { data, error } = await supabase
            .from("alerts")
            .update({ status: "read" })
            .eq("id", id)
            .select()
            .single();

        if (error) throw new Error(error.message);
        return data;
    },

    async deleteAlert(id: string) {
        const { error } = await supabase
            .from("alerts")
            .delete()
            .eq("id", id);

        if (error) throw new Error(error.message);
        return true;
    }
};

export default alertsService;
