
// services/geminiService.ts
// Integração oficial do Monkey Tips com Gemini 2.5 Flash + Grounding

export interface GeminiResponse {
    text: string;
    json?: any;
}

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL = "gemini-2.5-flash"; // versão oficial utilizada no Monkey

export const geminiService = {
    async ask(prompt: string, grounding: boolean = false): Promise<GeminiResponse> {
        if (!GEMINI_API_KEY) {
            throw new Error("GEMINI_API_KEY não configurada.");
        }

        const url = grounding
            ? "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + GEMINI_API_KEY
            : "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + GEMINI_API_KEY;

        const payload = {
            contents: [
                {
                    parts: [
                        { text: prompt }
                    ]
                }
            ],
            safetySettings: [
                { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: 4 }
            ]
        };

        if (grounding) {
            payload["tools"] = [{ codeExecution: {} }];
        }

        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
        let json = null;

        // Tenta extrair JSON se houver
        try {
            const match = text.match(/\{[\s\S]*\}/);
            if (match) json = JSON.parse(match[0]);
        } catch {}

        return { text, json };
    }
};