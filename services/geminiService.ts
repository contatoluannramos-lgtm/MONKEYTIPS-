
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Match, Tip, SportType, TicketAnalysis } from "../types";

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

const ticketSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    isValid: { type: Type.BOOLEAN, description: "Se é um bilhete de aposta válido/legível." },
    extractedTeams: { type: Type.STRING, description: "Times identificados na imagem." },
    extractedOdds: { type: Type.NUMBER, description: "Odd total identificada." },
    verdict: { type: Type.STRING, enum: ["APPROVED", "REJECTED", "RISKY"] },
    aiAnalysis: { type: Type.STRING, description: "Análise matemática do valor da aposta." },
    suggestedAction: { type: Type.STRING, description: "Ação recomendada (Cobrir, Cashout, Manter)." }
  },
  required: ["isValid", "extractedTeams", "extractedOdds", "verdict", "aiAnalysis", "suggestedAction"]
};

const getAIClient = () => {
  const apiKey = localStorage.getItem('monkey_gemini_api_key');
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
}

export const generateAnalysis = async (match: Match): Promise<Partial<Tip> | null> => {
  const ai = getAIClient();
  if (!ai) {
    console.error("Gemini API Key is missing");
    return null;
  }

  try {
    const modelId = "gemini-2.5-flash"; 
    
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
        temperature: 0.3, 
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

export const analyzeTicketImage = async (base64Image: string): Promise<TicketAnalysis | null> => {
  const ai = getAIClient();
  if (!ai) return null;

  try {
    // Remover prefixo data:image/png;base64, se existir para enviar apenas os bytes
    const cleanBase64 = base64Image.split(',')[1] || base64Image;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          inlineData: {
            mimeType: "image/jpeg",
            data: cleanBase64
          }
        },
        {
          text: "Analise este print de bilhete de aposta. Extraia os dados, verifique se as odds têm valor matemático esperado (EV+) e dê um veredito. Responda em JSON seguindo o schema."
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: ticketSchema
      }
    });

    const text = response.text;
    if (!text) return null;
    return JSON.parse(text) as TicketAnalysis;

  } catch (error) {
    console.error("Erro na análise visual:", error);
    return null;
  }
};

export const generateBulkInsights = async (matches: Match[]): Promise<Tip[]> => {
  const tips: Tip[] = [];
  
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
        isPremium: false,
        status: 'Pending'
      });
    }
  }
  return tips;
};
