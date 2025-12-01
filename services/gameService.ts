
// services/gameService.ts
import { supabase } from "../utils/supabaseClient";

const gameService = {
    async getAllGames() {
        const { data, error } = await supabase
            .from("games")
            .select("*")
            .order("start_time", { ascending: false });

        if (error) throw new Error(error.message);
        return data || [];
    },

    async getGameById(id: string) {
        const { data, error } = await supabase
            .from("games")
            .select("*")
            .eq("id", id)
            .single();

        if (error) throw new Error(error.message);
        return data;
    },

    async createGame(game: any) {
        const { data, error } = await supabase
            .from("games")
            .insert(game)
            .select()
            .single();

        if (error) throw new Error(error.message);
        return data;
    },

    async updateGame(id: string, updates: any) {
        const { data, error } = await supabase
            .from("games")
            .update(updates)
            .eq("id", id)
            .select()
            .single
