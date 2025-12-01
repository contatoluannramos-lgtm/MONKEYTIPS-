
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Match, Tip, SportType, TicketAnalysis, CalibrationConfig, ScreenAnalysisData, BotNewsPayload, NewsProcessedItem, StatProcessedItem } from "../types";
import { DEFAULT_CALIBRATION } from "./scoutEngine";
import { logger } from "../utils/logger";

const TARGET_TEAMS_BRASILEIRAO = [
  "Botafogo", "Palmeiras", "Fortaleza", "Flamengo", "Internacional", 
  "São Paulo", "Bahia", "Cruzeiro", "Vasco", "Atlético-MG"
];

// --- SCHEMAS ---
const tipSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    prediction: { type: Type.STRING, description: "A recomendação final curta e direta. Ex: 'Lakers -5.5' ou 'Over 220.5'." },
    confidence: { type: Type.INTEGER, description: "Porcentagem de confiança 0-100" },
    reasoning: { type: Type.STRING, description: "O texto completo formatado com as 8 regras fixas (Projeções, Variação, DanielScore, etc)." },
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
    context: { type: Type.STRING, description: "A análise formatada estritamente conforme o template solicitado (Projeções, Conclusão, Recomendação)." }
  },
  required: ["sport", "teamA", "teamB", "score", "time", "detectedOdds", "context"]
};

const botNewsSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    relevance: { type: Type.INTEGER, description: "0-100" },
    impact_level: { type: Type.STRING, enum: ["BAIXO", "MÉDIO", "ALTO"] },
    impact_score: { type: Type.INTEGER, description: "-30 a +30" },
    context: { type: Type.STRING, description: "Contexto esportivo gerado." },
    fusion_output: { type: Type.STRING, description: "Resumo para o Fusion Engine." },
    action: { type: Type.STRING, description: "Ação recomendada (Ex: Monitorar Odd, Suspender Tip)." }
  },
  required: ["relevance", "impact_level", "impact_score", "context", "fusion_output", "action"]
};

const statSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    category: { type: Type.STRING, enum: ["PLAYER_PROP", "TEAM_ADVANCED", "REFEREE"] },
    marketFocus: { type: Type.STRING, description: "O mercado de aposta sugerido. Ex: 'Over 1.5 Chutes no Alvo', 'Over Cartões', 'Haaland Score Any Time'." },
    probability: { type: Type.INTEGER, description: "Probabilidade estimada 0-100%" },
    aiAnalysis: { type: Type.STRING, description: "Explicação curta e técnica do porquê essa estatística é valiosa." }
  },
  required: ["category", "marketFocus", "probability", "aiAnalysis"]
};

const getAIClient = () => {
  if (!process.env.API_KEY) {
    logger.error("GEMINI", "Gemini API Key is missing from process.env.API_KEY");
    return null;
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
}

// Helper to get strategic instruction
const getStrategyForSport = (sport: SportType): string => {
  if (typeof window === 'undefined') return "";
  const savedConfig = localStorage.getItem('monkey_calibration_config');
  const config: CalibrationConfig = savedConfig ? JSON.parse(savedConfig) : DEFAULT_CALIBRATION;

  switch (sport) {
    case SportType.FOOTBALL: return config.football.instruction;
    case SportType.BASKETBALL: return "MODO NBA ATIVADO. Ignore ligas europeias. Considere jogos de 48 minutos, Pace alto, média de pontos > 220. Fatores chave: Lesões, Back-to-Back e Matchup direto de estrelas.";
    case SportType.VOLLEYBALL: return config.volleyball.instruction;
    case SportType.ICE_HOCKEY: return config.iceHockey.instruction;
    case SportType.ESPORTS: return "Analise KDA e controle de mapa (Dragões/Barão)."; 
    default: return "";
  }
};

const generateContentWithSchema = async (prompt: string, schema: Schema, model = "gemini-2.5-flash") => {
    const ai = getAIClient();
    if (!ai) throw new Error("Gemini client not initialized.");
    
    logger.info("GEMINI", "Generating content with schema...", { model });
    try {
        const response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: schema,
                temperature: 0.3,
            },
        });

        const text = response.text;
        if (!text) throw new Error("Empty response from Gemini API.");
        return JSON.parse(text);
    } catch (error) {
        logger.error("GEMINI", "Error in generateContentWithSchema", error);
        throw error;
    }
};

const generateMultimodalContent = async (textPrompt: string, base64Image: string, schema: Schema) => {
    const ai = getAIClient();
    if (!ai) throw new Error("Gemini client not initialized.");

    const cleanBase64 = base64Image.split(',')[1] || base64Image;

    logger.info("GEMINI", "Generating multimodal content...");
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [
                { inlineData: { mimeType: "image/jpeg", data: cleanBase64 } },
                { text: textPrompt }
            ],
            config: {
                responseMimeType: "application/json",
                responseSchema: schema
            }
        });
        
        const text = response.text;
        if (!text) throw new Error("Empty response from Gemini Vision API.");
        return JSON.parse(text);
    } catch (error) {
        logger.error("GEMINI", "Error in generateMultimodalContent", error);
        throw error;
    }
};

export const geminiEngine = {
    async generateMatchAnalysis(match: Match): Promise<Partial<Tip>> {
        const strategicInstruction = getStrategyForSport(match.sport);
        
        let historicalContext = "Histórico: Dados não disponíveis.";
        if (match.history) {
            historicalContext = `
            ANÁLISE DE HISTÓRICO (ÚLTIMOS 5 JOGOS):
            MANDANTE (${match.teamA}):
            - Resultados: ${match.history.home.last5Results.join('-')}
            - Média Gols/Pontos Marcados: ${match.history.home.avgGoalsFor}
            - Média Gols/Pontos Sofridos: ${match.history.home.avgGoalsAgainst}

            VISITANTE (${match.teamB}):
            - Resultados: ${match.history.away.last5Results.join('-')}
            - Média Gols/Pontos Marcados: ${match.history.away.avgGoalsFor}
            - Média Gols/Pontos Sofridos: ${match.history.away.avgGoalsAgainst}
            `;
        }

        const prompt = `
          PROMPT – MONKEY TIPS (MASTER SYSTEM CONFIG)
          Sua tarefa é atuar como o Analista Oficial.

          CONTEXTO DO JOGO:
          Esporte: ${match.sport}
          Partida: ${match.teamA} vs ${match.teamB}
          Liga: ${match.league}
          Status: ${match.status}
          Árbitro: ${match.referee || 'Desconhecido'}
          
          ${historicalContext}

          ESTATÍSTICAS TÉCNICAS (Se tudo for zero, é pré-jogo):
          ${JSON.stringify(match.stats)}

          PROTOCOLO TÁTICO: "${strategicInstruction}"

          REGRAS DE FORMATAÇÃO (Obrigatório incluir todos os 8 pontos):
          1. Projeção HT | 2. Projeção FT | 3. Projeção por time | 4. Faixa de variação | 5. Nível de confiança | 6. Recomendação objetiva | 7. Resumo técnico DanielScore | 8. Integração com Scout Engine + Fusion Engine

          ESTRUTURA DE SAÍDA (JSON 'reasoning'): Use Markdown.
        `;

        const data = await generateContentWithSchema(prompt, tipSchema);
        return {
            prediction: data.prediction,
            confidence: data.confidence,
            reasoning: data.reasoning,
            odds: data.odds,
        };
    },

    async processBotNews(payload: BotNewsPayload): Promise<Omit<NewsProcessedItem, 'id' | 'originalData' | 'status' | 'processedAt'>> {
        const prompt = `
          SYSTEM ROLE: Monkey Tips Integration Engine.
          TASK: Process raw news data from External Bot.
          
          RAW DATA:
          Source: ${payload.source} | League: ${payload.league} | Title: "${payload.title}" | Summary: "${payload.summary}" | Urgency: ${payload.urgency}/5

          PROTOCOL:
          1. Classify relevance (0-100) for market impact.
          2. Generate sport context.
          3. Calculate statistical impact (-30 to +30).
          4. Create a short summary for Fusion Engine.
          5. Recommend an action (e.g., "Monitor Odds", "Suspend Betting").

          OUTPUT FORMAT: Strict JSON. STYLE: Technical, direct.
        `;
        const aiData = await generateContentWithSchema(prompt, botNewsSchema);
        return {
            relevanceScore: aiData.relevance,
            impactLevel: aiData.impact_level,
            impactScore: aiData.impact_score,
            context: aiData.context,
            fusionSummary: aiData.fusion_output,
            recommendedAction: aiData.action,
        };
    },
    
    async processRawStat(entity: string, rawStat: string): Promise<Omit<StatProcessedItem, 'id' | 'entityName' | 'rawData' | 'status' | 'processedAt'>> {
        const prompt = `
            ROLE: MonkeyStats Intelligence (Player & Team Data Specialist).
            INPUT: Entity: "${entity}" | Raw Data: "${rawStat}"
            TASK: Analyze raw statistic, determine betting market opportunity.
            PROTOCOL: Identify Category, Suggest Market Focus, Estimate Probability, Provide technical analysis.
            OUTPUT: Strict JSON.
        `;
        const aiData = await generateContentWithSchema(prompt, statSchema);
        return {
            category: aiData.category,
            marketFocus: aiData.marketFocus,
            probability: aiData.probability,
            aiAnalysis: aiData.aiAnalysis,
        };
    },
    
    async analyzeTicketImage(base64Image: string): Promise<TicketAnalysis> {
        const prompt = `
            Atue como Analista Oficial do MonkeyTips. Analise este print de bilhete.
            1. Verifique a legibilidade e se é uma aposta esportiva (isValid).
            2. Extraia times e a odd total.
            3. Verifique matematicamente o valor (EV+).
            4. Em 'aiAnalysis', seja direto e militar. Apenas fatos matemáticos.
            5. Dê um veredito: APPROVED (Bom valor), REJECTED (Valor negativo), RISKY (Alto risco).
            Responda APENAS JSON.
        `;
        return generateMultimodalContent(prompt, base64Image, ticketSchema);
    },

    async analyzeScreenCapture(base64Image: string): Promise<ScreenAnalysisData> {
        const prompt = `
            VOCÊ É O MONKEY TIPS VISION ENGINE. MODO: ANÁLISE VISUAL AO VIVO.
            Sua função é ler a tela e gerar análise técnica IMEDIATA e OBJETIVA.

            PROTOCOLO DE SAÍDA OBRIGATÓRIO (Preencha o JSON):
            1. Detecte Placar, Tempo e Odds na imagem.
            2. Gere o campo 'context' SEGUINDO ESTRITAMENTE O TEMPLATE ABAIXO.
            
            TEMPLATE PARA 'context' (Use Markdown):
            📌 PROJEÇÕES
            • Projeção do placar FT: [Seu cálculo]
            • Probabilidade de vitória: [Time] [XX]%
            📌 CONCLUSÃO
            [1 frase curta descrevendo o momento do jogo]
            📌 RECOMENDAÇÃO MONKEYTIPS
            [Recomendação simples: ex: 'Vitória do Time X', ou 'Sem entrada segura']
        `;
        return generateMultimodalContent(prompt, base64Image, screenSchema);
    }
};
