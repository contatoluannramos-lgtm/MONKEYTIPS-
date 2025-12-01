
// services/databaseService.ts
// Conexão, leitura, gravação e utilidades do Supabase (Admin + Engines)

import { supabase } from "./supabaseClient";

export const databaseService = {
    // Busca registros genéricos
    async fetch(table: string, filters: any = {}) {
        let query = supabase.from(table).select("*");

        Object.keys(filters).forEach((key) => {
            query = query.eq(key, filters[key]);
        });

        const { data, error } = await query;

        if (error) {
            return {
                success: false,
                message: "Erro ao buscar dados",
                error: error.message,
            };
        }

        return { success: true, data };
    },

    // Inserir registro
    async insert(table: string, payload: any) {
        const { data, error } = await supabase.from(table).insert(payload);

        if (error) {
            return {
                success: false,
                message: "Erro ao inserir",
                error: error.message,
            };
        }

        return { success: true, data };
    },

    // Atualizar registro
    async update(table: string, id: string | number, payload: any) {
        const { data, error } = await supabase.from(table)
            .update(payload)
            .eq("id", id);

        if (error) {
            return {
                success: false,
                message: "Erro ao atualizar",
                error: error.message,
            };
        }

        return { success: true, data };
    },

    // Deletar registro
    async delete(table: string, id: string | number) {
        const { error } = await supabase.from(table)
            .delete()
            .eq("id", id);

        if (error) {
            return {
                success: false,
                message: "Erro ao deletar",
                error: error.message,
            };
        }

        return { success: true };
    }
};
    
