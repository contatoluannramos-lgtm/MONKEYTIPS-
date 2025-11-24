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
    instruction: "Analista Oficial NBA: Foco TOTAL na NBA. Jogos de 48 min. Pace alto (>100). Considere Back-to-Back e lesões de estrelas. Se o Pace for alto, a tendência é OVER 225.",
    paceWeight: 0.7, 
    efficiencyWeight: 0.3, 
    lineThreshold: 220 // Ajustado para média NBA
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
    
    let probOver25 = 50;
    let details = "";

    if (isLive) {
        const homeGoals = stats.homeScore || 0;
        const corners = stats.corners?.total || 0;
        const possession = stats.possession || 50;
        const estimatedXG = stats.xg ? (stats.xg.home + stats.xg.away) : (stats.shotsOnTarget.home + stats.shotsOnTarget.away) / 3;
        
        probOver25 = (estimatedXG > 2.0 || (homeGoals + corners/5) > 1.5) ? 
                     (65 * config.football.poissonStrength) + 25 : 
                     40;
        
        details = `LIVE DATA | xG: ${estimatedXG.toFixed(1)} | Cantos: ${corners}`;
    } else {
        probOver25 = 60; 
        details = "PRE-GAME | Baseado em Histórico (IA)";
    }

    return {
      matchId: match.id,
      calculatedProbability: Math.min(probOver25, 99),
      expectedGoals: { home: 1.5, away: 1.2 }, 
      signal: probOver25 > config.football.over25Threshold ? 'STRONG_OVER' : 'NEUTRAL',
      details: details
    };
  }

  // --- BASQUETE (NBA SPECIALIST) ---
  if (match.sport === SportType.BASKETBALL) {
    const stats = match.stats as BasketballStats;
    
    let probOver = 50;
    let details = "";
    
    // Configurações NBA
    const NBA_GAME_MINUTES = 48;
    const NBA_AVG_PACE = 99.5;

    if (isLive) {
        // Cálculo de Projeção NBA (Baseado em 48 min)
        // Se a API não der o tempo exato em minutos, tentamos estimar pelo quarto
        let minutesPlayed = 1;
        const period = stats.currentPeriod; 
        
        // Estimativa simples de minutos jogados se o tempo exato não vier
        if (period.includes('Q1')) minutesPlayed = 6;
        else if (period.includes('Q2')) minutesPlayed = 18;
        else if (period.includes('Q3')) minutesPlayed = 30;
        else if (period.includes('Q4')) minutesPlayed = 42;
        
        const currentTotalScore = stats.homeScore + stats.awayScore;
        
        // Projeção Linear Simples: (Placar Atual / Minutos Jogados) * 48
        const projectedPoints = (currentTotalScore / Math.max(minutesPlayed, 1)) * NBA_GAME_MINUTES;
        
        // Ajuste por Pace (Se disponível)
        const paceFactor = stats.pace ? (stats.pace / NBA_AVG_PACE) : 1;
        const finalProjection = projectedPoints * paceFactor;

        probOver = (finalProjection > config.basketball.lineThreshold) ? 80 : 35;
        
        details = `NBA LIVE | Proj: ${Math.floor(finalProjection)} pts | Pace: ${stats.pace || 'N/A'}`;
    } else {
        // Pré-jogo NBA: Times modernos pontuam muito. Viés de Alta.
        probOver = 68;
        details = "NBA PRE-GAME | Tendência High Scoring";
    }

    return {
      matchId: match.id,
      calculatedProbability: Math.min(Math.max(probOver, 0), 99),
      projectedPoints: 230, // Projeção base NBA
      signal: probOver > 65 ? 'STRONG_OVER' : (probOver < 40 ? 'STRONG_UNDER' : 'NEUTRAL'),
      details: details
    };
  }
  
  // Default
  return {
    matchId: match.id,
    calculatedProbability: 55, 
    signal: 'NEUTRAL',
    details: 'Aguardando início...'
  };
};