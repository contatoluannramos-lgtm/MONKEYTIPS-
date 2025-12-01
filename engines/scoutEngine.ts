
import { 
  Match, 
  SportType, 
  ScoutResult, 
  CalibrationConfig, 
  FootballStats, 
  BasketballStats, 
  VolleyballStats 
} from "../types";

import { logger } from "../utils/logger";

// -------------------------------------------------------------
// DEFAULT CONFIG (mantido, não mexe — usado por outras partes)
// -------------------------------------------------------------
export const DEFAULT_CALIBRATION: CalibrationConfig = {
  football: { 
    instruction: "ANALISTA OFICIAL MONKEY TIPS...",
    weightRecentForm: 0.3, 
    weightHeadToHead: 0.2, 
    poissonStrength: 0.5, 
    over25Threshold: 55 
  },
  basketball: { 
    instruction: "ANALISTA OFICIAL NBA...",
    paceWeight: 0.7, 
    efficiencyWeight: 0.3, 
    lineThreshold: 220
  },
  volleyball: { 
    instruction: "Analista Oficial...",
    setWinProbability: 0.7, 
    blockWeight: 0.3 
  },
  iceHockey: { 
    instruction: "Analista Oficial...",
    powerPlayWeight: 0.4, 
    goalieSaveRateWeight: 0.6 
  },
  onlineGames: { 
    instruction: "Analista Oficial...",
    volatilityIndex: 0.8, 
    rtpThreshold: 96.5 
  }
};

// -------------------------------------------------------------
// SCOUT ENGINE (CASCA) — Versão limpa sem cálculos reais
// -------------------------------------------------------------
export const runScoutAnalysis = (
  match: Match, 
  config: CalibrationConfig
): ScoutResult => {

  logger.info("SCOUT-CASCA", `runScoutAnalysis() chamado para match ${match.id}`, {
    sport: match.sport,
    status: match.status
  });

  // Retorno mínimo necessário para manter compatibilidade
  const base: ScoutResult = {
    matchId: match.id,
    calculatedProbability: 50,          // valor neutro
    signal: "NEUTRAL",                  // sem tendência
    details: "SCOUT ENGINE MODE: CASCA",// descrição limpa
    isHotGame: false,                   // nada de Hot Game
    spikeDetected: false,               // sem spikes
    spikeDetails: ""
  };

  // Adapta o retorno baseado no esporte para evitar erros
  if (match.sport === SportType.FOOTBALL) {
    return {
      ...base,
      expectedGoals: { home: 1.0, away: 1.0 } // valor placeholder
    };
  }

  if (match.sport === SportType.BASKETBALL) {
    return {
      ...base,
      projectedPoints: 200 // placeholder neutro
    };
  }

  if (match.sport === SportType.VOLLEYBALL) {
    return {
      ...base,
      projectedPoints: 180 // apenas para não quebrar onde é esperado
    };
  }

  return base;
};
