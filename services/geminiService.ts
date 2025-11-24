
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Match, Tip, SportType, TicketAnalysis, CalibrationConfig, ScreenAnalysisData } from "../types";
import { DEFAULT_CALIBRATION } from "./scoutEngine";

const tipSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    prediction: { type: Type.STRING, description: "A recomendação final curta e direta. Ex: 'Lakers -5.5' ou 'Over 2.5 Gols'." },
    confidence: { type: Type.INTEGER, description: "Porcentagem de confiança 0-100" },
    reasoning: { type: Type.STRING, description: "O texto completo formatado nos 3 blocos (Projeções, Conclusão, Recomendação)." },
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

const screenSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    sport: { type: Type.STRING, enum: ["Futebol", "Basquete", "Vôlei", "Hóquei no Gelo", "eSports (LoL/CS)"] },
    teamA: { type: Type.STRING },
    teamB: { type: Type.STRING },
    score: { type: Type.STRING, description: "Placar atual ex: 2-1" },
    time: { type: Type.STRING, description: "Tempo de jogo ex: 75', Q3 10:00" },
    detectedOdds: { 
      type: Type.ARRAY, 
      items: { 
        type: Type.OBJECT, 
        properties: { market: { type: Type.STRING }, value: { type: Type.NUMBER } } 
      } 
    },
    context: { type: Type.STRING, description: "Análise visual rápida: 'Pressão time A', 'Jogo parado VAR', etc." }
  },
  required: ["sport", "teamA", "teamB", "score", "time", "detectedOdds", "context"]
};

const getAIClient = () => {
  const apiKey = localStorage.getItem('monkey_gemini_api_key');
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
}

// Helper to get strategic instruction
const getStrategyForSport = (sport: SportType): string => {
  const savedConfig = localStorage.getItem('monkey_calibration_config');
  const config: CalibrationConfig = savedConfig ? JSON.parse(savedConfig) : DEFAULT_CALIBRATION;

  switch (sport) {
    case SportType.FOOTBALL: return config.football.instruction;
    case SportType.BASKETBALL: return config.basketball.instruction;
    case SportType.VOLLEYBALL: return config.volleyball.instruction;
    case SportType.ICE_HOCKEY: return config.iceHockey.instruction;
    case SportType.ESPORTS: return "Analise KDA e controle de mapa (Dragões/Barão)."; // Fallback ou custom
    default: return "";
  }
};

export const generateAnalysis = async (match: Match): Promise<Partial<Tip> | null> => {
  const ai = getAIClient();
  if (!ai) {
    console.error("Gemini API Key is missing");
    return null;
  }

  try {
    const modelId = "gemini-2.5-flash"; 
    
    const strategicInstruction = getStrategyForSport(match.sport);
    const isPreGame = match.status !== 'Live';

    const prompt = `
      Você é o Analista Oficial do MonkeyTips.
      
      CONTEXTO DO JOGO:
      Esporte: ${match.sport}
      Partida: ${match.teamA} vs ${match.teamB}
      Liga: ${match.league}
      Status: ${match.status}
      
      ESTATÍSTICAS TÉCNICAS (Se tudo for zero, é porque o jogo ainda não começou):
      ${JSON.stringify(match.stats)}

      PROTOCOLO DE ANÁLISE:
      "${strategicInstruction}"

      ⚠️ INSTRUÇÃO CRÍTICA PARA JOGOS AGENDADOS (Scheduled):
      Se as estatísticas acima estiverem zeradas, NÃO diga "sem dados".
      Use seu vasto conhecimento histórico sobre ${match.teamA} e ${match.teamB} para projetar o resultado.
      Considere: Forma recente, mando de campo e tradição.
      Se for jogo AO VIVO, use estritamente os números passados.

      REGRAS DE FORMATAÇÃO (3 BLOCOS):
      
      ⸻
      1) PROJEÇÕES MONKEYTIPS
      • [Dado estatístico ou histórico relevante]
      • [Tendência projetada]
      • [Probabilidade %]
      ⸻
      2) CONCLUSÃO
      [Resumo curto e tático de 2 linhas. Direto ao ponto.]
      ⸻
      3) RECOMENDAÇÃO MONKEYTIPS
      • [APOSTA ÚNICA] (Ex: Over 2.5 Gols, Lakers -5.5, Ambas Marcam)

      Retorne apenas JSON válido.
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
          text: `
            Atue como o Analista Oficial do MonkeyTips.
            Analise este print de bilhete de aposta.
            
            1. Verifique se a imagem é legível e se trata de uma aposta esportiva. Se não, isValid=false.
            2. Extraia os times e a odd total.
            3. Verifique matematicamente se a odd tem valor (EV+) ou se é uma aposta ruim.
            4. No campo 'aiAnalysis', seja curto, grosso e direto. Estilo militar. Nada de "eu acho" ou "parece". Diga os fatos matemáticos.
            5. Dê um veredito: APPROVED (Bom valor), REJECTED (Valor negativo), RISKY (Alto risco).
            
            Responda APENAS JSON.
          `
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

export const analyzeScreenCapture = async (base64Image: string): Promise<ScreenAnalysisData | null> => {
  const ai = getAIClient();
  if (!ai) return null;

  try {
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
          text: `
            SYSTEM: Monkey Vision Engine (Screen Reader)
            TASK: Analise esta captura de tela de um site de apostas (ao vivo).
            
            Extraia os seguintes dados para alimentar o Scout Engine:
            1. Placar exato.
            2. Tempo de jogo (minuto, período).
            3. Odds visíveis na tela (Mercado e Valor).
            4. Contexto visual (ex: estatísticas visíveis, gráficos de pressão, quem está atacando).
            
            Seja preciso. O Scout Engine depende desses números.
          `
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: screenSchema
      }
    });

    const text = response.text;
    if (!text) return null;
    return JSON.parse(text) as ScreenAnalysisData;

  } catch (error) {
    console.error("Erro na análise de tela:", error);
    return null;
  }
}

export const generateBulkInsights = async (matches: Match[]): Promise<Tip[]> => {
  const tips: Tip[] = [];
  
  // Processamento em lote, mas sequencial para evitar rate limit agressivo do Gemini se a lista for grande
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
