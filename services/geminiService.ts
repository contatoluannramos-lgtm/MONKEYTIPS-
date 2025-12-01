
// services/geminiService.ts
// Wrapper oficial para Google Gemini / Google AI Studio

import { supabase } from "./supabaseClient";

export const geminiService = {
    async processStats(entity: string, raw: string) {
        return {
            success: true,
            entity,
            raw,
            result: "[GEMINI_PLACEHOLDER_RESULT]"
        };
    }
};
