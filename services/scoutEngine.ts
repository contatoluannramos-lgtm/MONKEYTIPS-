
import { Match, SportType, ScoutResult, CalibrationConfig } from "../types";

// Configuração Padrão (Caso não tenha nada salvo)
export const DEFAULT_CALIBRATION: CalibrationConfig = {
  football: { 
    instruction: "Priorize a estatística de Gols Esperados (xG). Se ambos times têm xG > 1.5, indique Over. Ignore posse de bola estéril.",
    weightRecentForm: 0.3, 
    weightHeadToHead: 0.2, 
    poissonStrength: 0.5, 
    over25Threshold: 55 
  },
  basketball: { 
    instruction: "O Pace é o fator determinante. Acima de 102 posses, busque Overs. Ignore narrativas de 'rivalidade', foque nos números de eficiência.",
    paceWeight: 0.6, 
    efficiencyWeight: 0.4, 
    lineThreshold: 210 
  },
  volleyball: { 
    instruction: "Analise a consistência do saque. Se a taxa de erro for alta, projete sets longos (Over pontos).",
    setWinProbability: 0.7, 
    blockWeight: 0.3 
  },
  iceHockey: { 
    instruction: "Power Play define o jogo. Se o time tem PP% > 25%, a vantagem é clara.",
    powerPlayWeight: 0.4, 
    goalieSaveRateWeight: 0.6 
  },
  onlineGames: { 
    instruction: "Analise friamente RTP e Volatilidade. Se a variância for alta, recomende cautela extrema.",
    volatilityIndex: 0.8, 
    rtpThreshold: 96.5 
  }
};

// Algoritmo Simples de Poisson (Simulação)
const calculatePoisson = (lambda: number, k: number) => {
  return (Math.pow(lambda, k) * Math.exp(-lambda)) / 1; // Simplificado factorial
};

export const runScoutAnalysis = (match: Match, config: CalibrationConfig): ScoutResult => {
  
  // --- FUTEBOL ---
  if (match.sport === SportType.FOOTBALL) {
    // Mock de cálculo baseado nas stats disponíveis
    const homeStrength = (match.stats.possession || 50) / 50;
    const formBonus = match.stats.recentForm?.includes('W-W') ? 0.1 : 0;
    
    // Lambda estimada (gols esperados)
    const lambdaHome = 1.4 * homeStrength + formBonus;
    const lambdaAway = 1.1;

    const expectedGoalsTotal = lambdaHome + lambdaAway;
    const probOver25 = (expectedGoalsTotal / 3.5) * 100 * config.football.poissonStrength;

    return {
      matchId: match.id,
      calculatedProbability: Math.min(probOver25, 99),
      expectedGoals: { home: Number(lambdaHome.toFixed(2)), away: Number(lambdaAway.toFixed(2)) },
      signal: probOver25 > config.football.over25Threshold ? 'STRONG_OVER' : 'NEUTRAL',
      details: `xG Home: ${lambdaHome.toFixed(2)} | xG Away: ${lambdaAway.toFixed(2)} (Poisson)`
    };
  }

  // --- BASQUETE ---
  if (match.sport === SportType.BASKETBALL) {
    const pace = match.stats.pace || 98;
    const efficiency = match.stats.efficiency || 105;
    
    const projectedPoints = (pace * (efficiency / 100)) * 2; // Home + Away approx
    const probOver = (projectedPoints > config.basketball.lineThreshold) ? 75 : 40;

    return {
      matchId: match.id,
      calculatedProbability: probOver,
      projectedPoints: Math.floor(projectedPoints),
      signal: probOver > 60 ? 'STRONG_OVER' : 'STRONG_UNDER',
      details: `Proj. Points: ${Math.floor(projectedPoints)} | Pace: ${pace}`
    };
  }
  
  // --- HÓQUEI (NOVO) ---
  if (match.sport === SportType.ICE_HOCKEY) {
    // Simulação baseada em Power Play
    const ppStrength = config.iceHockey.powerPlayWeight * 100;
    return {
      matchId: match.id,
      calculatedProbability: 55,
      signal: 'NEUTRAL',
      details: `PowerPlay Impact: ${ppStrength}%`
    };
  }

  // Default
  return {
    matchId: match.id,
    calculatedProbability: 50,
    signal: 'NEUTRAL',
    details: 'Dados insuficientes para cálculo Scout.'
  };
};
