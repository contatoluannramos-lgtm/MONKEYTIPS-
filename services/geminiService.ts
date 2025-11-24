
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Match, Tip, SportType, TicketAnalysis, CalibrationConfig, ScreenAnalysisData, NewsAnalysis, TARGET_TEAMS_BRASILEIRAO } from "../types";
import { DEFAULT_CALIBRATION } from "./scoutEngine";

const tipSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    prediction: { type: Type.STRING, description: "A recomendação final curta e direta. Ex: 'Lakers -5.5' ou 'Over 220.5'." },
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

const newsSchema: Schema = {
    type: Type.OBJECT,
    properties: {
        headline: { type: Type.STRING, description: "Manchete resumida do fato" },
        impactScore: { type: Type.INTEGER, description: "Impacto percentual de -30 a +30" },
        affectedSector: { type: Type.STRING, enum: ['MORALE', 'TACTICAL', 'MARKET_ODDS', 'LINEUP'] },
        summary: { type: Type.STRING, description: "Resumo curto do impacto na aposta" },
        relatedTeam: { type: Type.STRING, description: "Time do G10 afetado" },
        facts: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Lista de fatos relevantes extraídos" },
        team1Impact: { type: Type.STRING, description: "Impacto no time 1" },
        team2Impact: { type: Type.STRING, description: "Impacto no time 2" },
        projectionChange: { type: Type.STRING, description: "Como isso altera as projeções" }
    },
    required: ["headline", "impactScore", "affectedSector", "summary", "facts", "team1Impact", "team2Impact", "projectionChange"]
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

      REGRAS DE FORMATAÇÃO (3 BLOCOS OBRIGATÓRIOS):
      
      ⸻
      1) PROJEÇÕES MONKEYTIPS
      • [Dado estatístico cruzado]
      • [Tendência projetada baseada nos últimos 5 jogos]
      • [Probabilidade %]
      ⸻
      2) CONCLUSÃO
      [Resumo curto e tático de 2 linhas. Direto ao ponto. Sem enrolação.]
      ⸻
      3) RECOMENDAÇÃO MONKEYTIPS
      • [APOSTA ÚNICA] (Ex: Lakers -5.5, Over 225.5 Points)

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
      ATUE COMO: Monkey News Engine (Sistema de Inteligência).
      INPUT TYPE: ${mode}
      INPUT DATA: "${input}"

      CONTEXTO: Analise o impacto desta notícia para os seguintes times monitorados: ${TARGET_TEAMS_BRASILEIRAO.join(', ')}.

      TAREFA:
      1. Extraia a manchete e os fatos principais.
      2. Avalie o impacto (-30 a +30) nas odds/moral.
      3. Identifique se afeta escalação, tática ou mercado.
      4. Gere um resumo focado em apostadores.

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
    console.error("Erro na análise visual de tela:", error);
    return null;
  }
};
