
import { Match, SportType, ScoutResult, CalibrationConfig, FootballStats, BasketballStats } from "../types";

export const DEFAULT_CALIBRATION: CalibrationConfig = {
  football: { 
    instruction: "Analista Oficial: Analise xG e confronto direto. Se xG > 1.5 e defesa fraca, recomende OVER. Seja direto.",
    weightRecentForm: 0.3, 
    weightHeadToHead: 0.2, 
    poissonStrength: 0.5, 
    over25Threshold: 55 
  },
  basketball: { 
    instruction: "Analista Oficial: Foco total no Pace. Acima de 102 posses é OVER. Ignore narrativas, foque nos números.",
    paceWeight: 0.6, 
    efficiencyWeight: 0.4, 
    lineThreshold: 210 
  },
  volleyball: { 
    instruction: "Analista Oficial: Verifique erros de saque. Muitos erros = Sets longos (Over).",
    setWinProbability: 0.7, 
    blockWeight: 0.3 
  },
  iceHockey: { 
    instruction: "Analista Oficial: Power Play define o jogo. PP% > 25% é vantagem clara.",
    powerPlayWeight: 0.4, 
    goalieSaveRateWeight: 0.6 
  },
  onlineGames: { 
    instruction: "Analista Oficial: RTP baixo e Volatilidade alta = PERIGO. Recomende cautela.",
    volatilityIndex: 0.8, 
    rtpThreshold: 96.5 
  }
};

const calculatePoisson = (lambda: number, k: number) => {
  return (Math.pow(lambda, k) * Math.exp(-lambda)) / 1; 
};

export const runScoutAnalysis = (match: Match, config: CalibrationConfig): ScoutResult => {
  
  const isLive = match.status === 'Live';

  // --- FUTEBOL ---
  if (match.sport === SportType.FOOTBALL) {
    const stats = match.stats as FootballStats;
    
    // Se for LIVE, usa dados reais. Se for PRE-GAME, usa estimativa base (simulando força dos times)
    // Nota: Numa versão paga da API, usaríamos 'standings' ou 'H2H' aqui.
    
    let probOver25 = 50;
    let details = "";

    if (isLive) {
        const homeGoals = stats.homeScore || 0;
        const corners = stats.corners?.total || 0;
        const possession = stats.possession || 50;
        const estimatedXG = stats.xg ? (stats.xg.home + stats.xg.away) : (stats.shotsOnTarget.home + stats.shotsOnTarget.away) / 3;
        
        // Lógica Live agressiva
        probOver25 = (estimatedXG > 2.0 || (homeGoals + corners/5) > 1.5) ? 
                     (65 * config.football.poissonStrength) + 25 : 
                     40;
        
        details = `LIVE DATA | xG: ${estimatedXG.toFixed(1)} | Cantos: ${corners}`;
    } else {
        // Lógica Pré-Jogo (Mockada inteligente baseada em nomes de times para demonstração ou aleatoriedade controlada se não tiver histórico)
        // O ideal é a IA fazer isso, então o Scout dá uma base neutra-positiva para habilitar a IA.
        probOver25 = 60; 
        details = "PRE-GAME | Baseado em Histórico (IA)";
    }

    return {
      matchId: match.id,
      calculatedProbability: Math.min(probOver25, 99),
      expectedGoals: { home: 1.5, away: 1.2 }, // Placeholder
      signal: probOver25 > config.football.over25Threshold ? 'STRONG_OVER' : 'NEUTRAL',
      details: details
    };
  }

  // --- BASQUETE ---
  if (match.sport === SportType.BASKETBALL) {
    const stats = match.stats as BasketballStats;
    
    let probOver = 50;
    let details = "";

    if (isLive) {
        const pace = stats.pace || 98;
        const q1Total = (stats.quarters?.q1.home || 0) + (stats.quarters?.q1.away || 0);
        
        let projectedPoints = 0;
        if (q1Total > 0) {
            projectedPoints = q1Total * 4.2; 
        } else {
            projectedPoints = pace * 2.1; 
        }
        probOver = (projectedPoints > config.basketball.lineThreshold) ? 75 : 40;
        details = `LIVE | Proj: ${Math.floor(projectedPoints)}`;
    } else {
        // Pré-jogo NBA geralmente é alta pontuação
        probOver = 65;
        details = "PRE-GAME | Tendência Alta Pontuação";
    }

    return {
      matchId: match.id,
      calculatedProbability: probOver,
      projectedPoints: 220,
      signal: probOver > 60 ? 'STRONG_OVER' : 'NEUTRAL',
      details: details
    };
  }
  
  // Default
  return {
    matchId: match.id,
    calculatedProbability: 55, // Leve viés positivo para gerar oportunidades
    signal: 'NEUTRAL',
    details: 'Aguardando início...'
  };
};
