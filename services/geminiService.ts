import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Match, Tip, SportType, TicketAnalysis, CalibrationConfig, ScreenAnalysisData, NewsAnalysis, BotNewsPayload, NewsProcessedItem, TARGET_TEAMS_BRASILEIRAO, StatProcessedItem } from "../types";
import { DEFAULT_CALIBRATION } from "./scoutEngine";

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

const newsSchema: Schema = {
    type: Type.OBJECT,
    properties: {
        headline: { type: Type.STRING, description: "Manchete resumida do fato" },
        impactScore: { type: Type.INTEGER, description: "Impacto percentual de -30 a +30" },
        affectedSector: { type: Type.STRING, enum: ['MORALE', 'TACTICAL', 'MARKET_ODDS', 'LINEUP'] },
        summary: { type: Type.STRING, description: "Resumo curto do impacto na aposta" },
        relatedTeam: { type: Type.STRING, description: "Time do G10 afetado, ou 'Nenhum' se geral" },
        facts: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Lista de pontos críticos (lesões, crises, clima)" },
        team1Impact: { type: Type.STRING, description: "Descrição do impacto no Time 1 (Ofensiva/Defensiva)" },
        team2Impact: { type: Type.STRING, description: "Descrição do impacto no Time 2" },
        projectionChange: { type: Type.STRING, description: "Como isso altera as projeções (ex: Ajuste no motor ofensivo)" }
    },
    required: ["headline", "impactScore", "affectedSector", "summary", "facts", "team1Impact", "team2Impact", "projectionChange"]
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
    console.error("Gemini API Key is missing from process.env.API_KEY");
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

export const generateAnalysis = async (match: Match): Promise<Partial<Tip> | null> => {
  const ai = getAIClient();
  if (!ai) {
    console.error("Gemini API Key is missing");
    return null;
  }

  try {
    const modelId = "gemini-2.5-flash"; 
    
    const strategicInstruction = getStrategyForSport(match.sport);
    
    // Construção do bloco de dados históricos (Cross-Reference)
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

        INSTRUÇÃO DE CRUZAMENTO:
        Cruze especificamente a média de ataque do Mandante com a média de defesa do Visitante.
        Para NBA, verifique se a soma das médias projeta um placar acima de 220 pontos.
        `;
    }

    const prompt = `
      PROMPT – MONKEY TIPS (MASTER SYSTEM CONFIG)

      Você é o sistema oficial do Monkey Tips, composto pelos módulos:
      • Scout Engine
      • Fusion Engine
      • Monkey Vision
      • Monkey News Engine
      • Painel Administrativo
      • Painel do Analista

      Sua tarefa é atuar como o Analista Oficial, estruturando os dados abaixo.

      CONTEXTO DO JOGO:
      Esporte: ${match.sport} (Foco: NBA se for Basquete)
      Partida: ${match.teamA} vs ${match.teamB}
      Liga: ${match.league}
      Status: ${match.status}
      Árbitro: ${match.referee || 'Desconhecido'} (Considere o perfil disciplinar do juiz se for futebol)
      
      ${historicalContext}

      ESTATÍSTICAS TÉCNICAS (Se tudo for zero, é porque o jogo ainda não começou):
      ${JSON.stringify(match.stats)}

      PROTOCOLO TÁTICO PERSONALIZADO:
      "${strategicInstruction}"

      ⚠️ INSTRUÇÃO CRÍTICA:
      Se tiver dados históricos acima, use-os como base principal para o viés da análise.
      Se as estatísticas técnicas estiverem zeradas (Scheduled), confie 100% no histórico e conhecimento prévio.

      REGRAS DE FORMATAÇÃO FIXAS (Obrigatório incluir todos os 8 pontos no texto):
      1. Projeção HT
      2. Projeção FT
      3. Projeção por time
      4. Faixa de variação
      5. Nível de confiança
      6. Recomendação objetiva
      7. Resumo técnico DanielScore
      8. Integração com Scout Engine + Fusion Engine

      ESTRUTURA DE SAÍDA (JSON 'reasoning'):
      Use Markdown para formatar a resposta.
      
      Exemplo de Reasoning:
      "**1. Projeção HT:** 1-0 | **2. Projeção FT:** 2-1
       **3. Projeção Times:** Mandante (1.8 goals), Visitante (0.9 goals)
       **4. Variação:** 2-3 gols no total.
       **5. Confiança:** 78% (High)
       **6. Recomendação:** Over 2.5 Gols
       **7. DanielScore:** Jogo de alta intensidade ofensiva, xG superior a 1.5.
       **8. Fusion:** Alinhado com Scout Engine."

      Retorne apenas JSON válido conforme schema.
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

export const generateBulkInsights = async (matches: Match[]): Promise<Tip[]> => {
  const promises = matches.map(async (match) => {
    try {
      const analysis = await generateAnalysis(match);
      if (analysis && analysis.prediction && analysis.confidence && analysis.odds) {
        return {
          id: `tip-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          matchId: match.id,
          matchTitle: `${match.teamA} x ${match.teamB}`,
          sport: match.sport,
          prediction: analysis.prediction,
          confidence: analysis.confidence,
          odds: analysis.odds,
          reasoning: analysis.reasoning || '',
          createdAt: new Date().toISOString(),
          isPremium: analysis.confidence > 80,
          status: 'Pending'
        } as Tip;
      }
    } catch (e) {
      console.error(`Failed to analyze match ${match.id}`, e);
    }
    return null;
  });

  const results = await Promise.all(promises);
  return results.filter((t): t is Tip => t !== null);
};

export const analyzeSportsNews = async (input: string, mode: 'TEXT' | 'URL'): Promise<NewsAnalysis | null> => {
  const ai = getAIClient();
  if (!ai) return null;

  try {
    const prompt = `
      ATUE COMO: Monkey News Engine (Módulo de Inteligência).
      INPUT TYPE: ${mode}
      INPUT DATA: "${input}"
      TIMES MONITORADOS (Top 10 + Finalistas): ${TARGET_TEAMS_BRASILEIRAO.join(', ')}.

      PROTOCOLO OBRIGATÓRIO:
      1. Extraia pontos críticos: Lesões, Suspensões, Clima, Crise, Escalação, Fadiga, Pressão.
      2. Calcule IMPACT SCORE de -30% a +30% (Negativo prejudica o time, Positivo ajuda).
      3. Gere um relatório curto e direto seguindo a estrutura de campos.
      
      SE FOR URL: Como você é uma IA, simule a leitura do portal baseada no seu conhecimento sobre o momento atual destes times.
      SE FOR TEXTO: Analise o conteúdo fornecido.

      Retorne JSON conforme schema.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: newsSchema
      }
    });

    const text = response.text;
    if (!text) return null;
    return JSON.parse(text) as NewsAnalysis;
  } catch (error) {
    console.error("News Engine Error:", error);
    return null;
  }
};

// --- MONKEY STATS PROCESSOR ---
export const processMonkeyStats = async (entity: string, rawStat: string): Promise<StatProcessedItem | null> => {
  const ai = getAIClient();
  if (!ai) return null;

  try {
    const prompt = `
      ROLE: MonkeyStats Intelligence (Player & Team Data Specialist).
      
      INPUT:
      Entity: "${entity}"
      Raw Data: "${rawStat}"

      TASK:
      Analyze this raw statistic and determine if it indicates a specific betting market opportunity (Player Props or Team Advanced).

      PROTOCOL:
      1. Identify the Category (Player Prop, Team Advanced, Referee).
      2. Suggest a specific Market Focus (e.g., "Over 0.5 Shots on Target").
      3. Estimate the Probability based on the trend described in raw data.
      4. Provide a short technical analysis explaining why this trend matters.

      OUTPUT: Strict JSON.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: statSchema
      }
    });

    const text = response.text;
    if (!text) return null;
    
    const aiData = JSON.parse(text);

    return {
      id: `stat-${Date.now()}`,
      entityName: entity,
      category: aiData.category,
      rawData: rawStat,
      marketFocus: aiData.marketFocus,
      probability: aiData.probability,
      aiAnalysis: aiData.aiAnalysis,
      status: 'PENDING',
      processedAt: new Date().toISOString()
    };

  } catch (error) {
    console.error("MonkeyStats Error:", error);
    return null;
  }
};

// --- NEW FUNCTION: BOT PAYLOAD PROCESSOR ---
export const processBotNews = async (payload: BotNewsPayload): Promise<NewsProcessedItem | null> => {
  const ai = getAIClient();
  if (!ai) return null;

  try {
    const prompt = `
      SYSTEM ROLE: Monkey Tips Integration Engine.
      TASK: Process raw news data from External Bot.
      
      RAW DATA:
      Source: ${payload.source}
      League: ${payload.league}
      Title: "${payload.title}"
      Summary: "${payload.summary}"
      Urgency Level: ${payload.urgency}/5

      PROTOCOL:
      1. Clean and standardize the data.
      2. Classify relevance (0-100) based on potential market impact.
      3. Generate sport context explanation.
      4. Calculate statistical impact (-30 to +30) on projections.
      5. Create a short summary for the Fusion Engine.
      6. Recommend an action (e.g., "Monitor Odds", "Suspend Betting").

      OUTPUT FORMAT: Strict JSON.
      STYLE: Technical, direct, objective. No fluff.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: botNewsSchema
      }
    });

    const text = response.text;
    if (!text) return null;
    
    const aiData = JSON.parse(text);

    return {
      id: `news-${Date.now()}`,
      originalData: payload,
      relevanceScore: aiData.relevance,
      impactLevel: aiData.impact_level,
      impactScore: aiData.impact_score,
      context: aiData.context,
      fusionSummary: aiData.fusion_output,
      recommendedAction: aiData.action,
      status: 'PENDING',
      processedAt: new Date().toISOString()
    };

  } catch (error) {
    console.error("Integration Engine Error:", error);
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
            VOCÊ É O MONKEY TIPS VISION ENGINE.
            MODO: ANÁLISE VISUAL AO VIVO.
            
            Sua função é ler a tela (print ou frame de vídeo) e gerar análise técnica IMEDIATA e OBJETIVA.

            PROTOCOLO DE SAÍDA OBRIGATÓRIO (Preencha o JSON):
            1. Detecte Placar, Tempo e Odds na imagem.
            2. Gere o texto do campo 'context' SEGUINDO ESTRITAMENTE O TEMPLATE ABAIXO.
            
            TEMPLATE PARA O CAMPO 'context' (Copie a estrutura e use Markdown):

            📌 PROJEÇÕES
            • Projeção do placar FT: [Seu cálculo]
            • Projeção por time: [Quem cresce e quem cai]
            • Probabilidade de vitória: [Time] [XX]%

            📌 CONCLUSÃO
            [1 frase curta descrevendo quem está mais perto do objetivo]

            📌 RECOMENDAÇÃO MONKEYTIPS
            [Recomendação simples: ex: 'Vitória do Time X', 'Under/Over', ou 'Sem entrada segura']

            
            REGRAS:
            - Não explique o raciocínio.
            - Seja curto e direto.
            - Preencha os campos 'sport', 'teamA', 'teamB', 'score', 'time' com o que ver na imagem.
            - Se não encontrar odds, deixe lista vazia.
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
    console.error("Erro na análise visual de tela:", error);
    return null;
  }
};