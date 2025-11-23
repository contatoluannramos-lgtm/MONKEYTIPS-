import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Match, Tip, SportType } from "../types";

// Initialize Gemini Client
const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

const tipSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    prediction: { type: Type.STRING, description: "O palpite de aposta, ex: 'Over 2.5 Gols' ou 'Lakers -5.5'. Em Português." },
    confidence: { type: Type.INTEGER, description: "Porcentagem de confiança 0-100" },
    reasoning: { type: Type.STRING, description: "Breve análise tática explicando o palpite baseado nas estatísticas. Em Português." },
    odds: { type: Type.NUMBER, description: "Odds decimais estimadas para este mercado." }
  },
  required: ["prediction", "confidence", "reasoning", "odds"],
};

export const generateAnalysis = async (match: Match): Promise<Partial<Tip> | null> => {
  if (!apiKey) {
    console.error("API Key is missing");
    return null;
  }

  try {
    const modelId = "gemini-2.5-flash"; // Efficient for structured data tasks
    
    const prompt = `
      Atue como um analista esportivo profissional de alto nível para o sistema 'Monkey Tips'.
      Analise os dados da partida a seguir e gere um palpite de aposta de alto valor (Tip).
      
      Esporte: ${match.sport}
      Partida: ${match.teamA} vs ${match.teamB}
      Liga: ${match.league}
      Estatísticas: ${JSON.stringify(match.stats)}
      
      Considere configurações táticas, forma recente, desfalques e métricas específicas do esporte (xG para futebol, Pace para basquete, etc).
      A resposta deve ser estritamente em Português do Brasil.
      Retorne apenas JSON.
    `;

    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: tipSchema,
        temperature: 0.3, // Lower temperature for more analytical/consistent results
      },
    });

    const text = response.text;
    if (!text) return null;

    const data = JSON.parse(text);

    return {
      prediction: data.prediction,
      confidence: data.confidence,
      reasoning: data.reasoning,
      odds: data.odds,
    };

  } catch (error) {
    console.error("Error generating sports analysis:", error);
    return null;
  }
};

export const generateBulkInsights = async (matches: Match[]): Promise<Tip[]> => {
  const tips: Tip[] = [];
  
  // In a real app, we might parallelize this, but we'll do sequential for simplicity/rate limits
  for (const match of matches) {
    const analysis = await generateAnalysis(match);
    if (analysis) {
      tips.push({
        id: `tip-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        matchId: match.id,
        matchTitle: `${match.teamA} x ${match.teamB}`,
        sport: match.sport,
        prediction: analysis.prediction || "N/A",
        confidence: analysis.confidence || 0,
        reasoning: analysis.reasoning || "Análise indisponível.",
        odds: analysis.odds || 1.5,
        createdAt: new Date().toISOString(),
        isPremium: false
      });
    }
  }
  return tips;
};