
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
  
  // --- FUTEBOL ---
  if (match.sport === SportType.FOOTBALL) {
    const stats = match.stats as FootballStats; // Type Assertion for deeper access
    
    // Dados reais ou fallback
    const homeGoals = stats.homeScore || 0;
    const corners = stats.corners?.total || 0;
    const possession = stats.possession || 50;

    // Lógica Matemática
    const homeStrength = (possession / 50);
    // Se tivermos xG, usamos, senão estimamos por chutes
    const estimatedXG = stats.xg ? (stats.xg.home + stats.xg.away) : (stats.shotsOnTarget.home + stats.shotsOnTarget.away) / 3;
    
    const probOver25 = (estimatedXG > 2.5 || (homeGoals + corners/4) > 2) ? 
                       (60 * config.football.poissonStrength) + 20 : 
                       40;

    return {
      matchId: match.id,
      calculatedProbability: Math.min(probOver25, 99),
      expectedGoals: { home: Number((estimatedXG * 0.6).toFixed(2)), away: Number((estimatedXG * 0.4).toFixed(2)) },
      signal: probOver25 > config.football.over25Threshold ? 'STRONG_OVER' : 'NEUTRAL',
      details: `xG Est: ${estimatedXG.toFixed(2)} | Cantos: ${corners}`
    };
  }

  // --- BASQUETE ---
  if (match.sport === SportType.BASKETBALL) {
    const stats = match.stats as BasketballStats;
    
    const pace = stats.pace || 98;
    const q1Total = (stats.quarters?.q1.home || 0) + (stats.quarters?.q1.away || 0);
    
    // Projeção baseada no Q1 ou Pace
    let projectedPoints = 0;
    if (q1Total > 0) {
        projectedPoints = q1Total * 4; // Projeção linear simples
    } else {
        projectedPoints = pace * 2.1; // Estimativa via Pace
    }

    const probOver = (projectedPoints > config.basketball.lineThreshold) ? 75 : 40;

    return {
      matchId: match.id,
      calculatedProbability: probOver,
      projectedPoints: Math.floor(projectedPoints),
      signal: probOver > 60 ? 'STRONG_OVER' : 'STRONG_UNDER',
      details: `Proj. Pts: ${Math.floor(projectedPoints)} | Q1: ${q1Total}`
    };
  }
  
  // Default
  return {
    matchId: match.id,
    calculatedProbability: 50,
    signal: 'NEUTRAL',
    details: 'Aguardando dados profundos...'
  };
};
