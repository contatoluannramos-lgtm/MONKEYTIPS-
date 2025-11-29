
import { Match, SportType, ScoutResult, CalibrationConfig, FootballStats, BasketballStats, VolleyballStats } from "../types";
import { logger } from "../utils/logger";

export const DEFAULT_CALIBRATION: CalibrationConfig = {
  football: { 
    instruction: "ANALISTA OFICIAL MONKEY TIPS: Analise xG, confronto direto e FADIGA DE FIM DE SEMANA. Se o mandante jogou copa no meio da semana, considere UNDER ou zebra. Se xG > 1.8, recomende OVER. Seja direto.",
    weightRecentForm: 0.3, 
    weightHeadToHead: 0.2, 
    poissonStrength: 0.5, 
    over25Threshold: 55 
  },
  basketball: { 
    instruction: "ANALISTA OFICIAL NBA: Jogos de Fim de Semana tendem a ser espetáculos (High Scoring) ou rotação total (Low Scoring). Verifique se é Back-to-Back. Se Pace > 102, Over 230 é o alvo.",
    paceWeight: 0.7, 
    efficiencyWeight: 0.3, 
    lineThreshold: 220
  },
  volleyball: { 
    instruction: "Analista Oficial: Verifique erros de saque. Muitos erros = Sets longos (Over). 24-24 é gatilho de Hot Game.",
    setWinProbability: 0.7, 
    blockWeight: 0.3 
  },
  iceHockey: { 
    instruction: "Analista Oficial: Power Play define o jogo. PP% > 25% é vantagem clara. Goleiro com SV% < .900 é alvo de Over.",
    powerPlayWeight: 0.4, 
    goalieSaveRateWeight: 0.6 
  },
  onlineGames: { 
    instruction: "Analista Oficial: RTP baixo e Volatilidade alta = PERIGO. Recomende cautela.",
    volatilityIndex: 0.8, 
    rtpThreshold: 96.5 
  }
};

const calculateBayesianProbability = (priorProb: number, liveProb: number, progress: number): number => {
    const liveWeight = Math.min(progress, 0.8);
    const priorWeight = 1.0 - liveWeight;
    const result = ((priorProb * priorWeight) + (liveProb * liveWeight));
    logger.info("SCOUT", `Bayesian Calc: (prior: ${priorProb} * ${priorWeight.toFixed(2)}) + (live: ${liveProb} * ${liveWeight.toFixed(2)}) = ${result.toFixed(2)}`);
    return result;
};

const detectHotGame = (sport: SportType, stats: any): boolean => {
    if (sport === SportType.BASKETBALL && stats.pace) {
        const q1Score = (stats.quarters?.q1?.home || 0) + (stats.quarters?.q1?.away || 0);
        return stats.pace > 102 || q1Score > 60;
    }
    if (sport === SportType.FOOTBALL && stats.currentMinute > 0) {
        const attacksPerMin = (stats.attacks?.dangerous || 0) / stats.currentMinute;
        return attacksPerMin > 0.8;
    }
    if (sport === SportType.VOLLEYBALL && stats.currentSetScore) {
        const { home, away } = stats.currentSetScore;
        return (home > 20 || away > 20) && Math.abs(home - away) <= 2;
    }
    return false;
};

const detectSpikes = (sport: SportType, stats: any): { detected: boolean, details: string } => {
    if (sport === SportType.FOOTBALL && stats.currentMinute > 0) {
        if (((stats.attacks?.dangerous || 0) / stats.currentMinute) > 1.5) {
            return { detected: true, details: 'PRESSURE STORM (1.5+ Att/Min)' };
        }
    }
    if (sport === SportType.BASKETBALL && stats.pace > 110) {
        return { detected: true, details: 'SCORING RUN DETECTED' };
    }
    return { detected: false, details: '' };
};

export const runScoutAnalysis = (match: Match, config: CalibrationConfig): ScoutResult => {
  const isLive = match.status === 'Live';
  let isHot = false;
  let spikeInfo = { detected: false, details: '' };

  if (match.sport === SportType.FOOTBALL) {
    const stats = match.stats as FootballStats;
    const priorProb = 55 + (config.football.weightRecentForm * 10);
    let finalProb = priorProb;
    let details = "PRE-GAME | Scout baseado em Histórico (Prior)";

    if (isLive && stats.currentMinute > 0) {
        const estimatedXG = stats.xg ? (stats.xg.home + stats.xg.away) : (((stats.shotsOnTarget?.home || 0) + (stats.shotsOnTarget?.away || 0)) / 3);
        const liveProb = (estimatedXG > 2.0) ? (75 * config.football.poissonStrength) + 25 : 30;
        const matchProgress = Math.min(stats.currentMinute / 90, 1);
        finalProb = calculateBayesianProbability(priorProb, liveProb, matchProgress);
        isHot = detectHotGame(SportType.FOOTBALL, stats);
        spikeInfo = detectSpikes(SportType.FOOTBALL, stats);
        details = `BAYESIAN | xG: ${estimatedXG.toFixed(1)} | Hot: ${isHot ? 'YES' : 'NO'}`;
    }

    return {
      matchId: match.id,
      calculatedProbability: Math.min(finalProb, 99),
      expectedGoals: { home: 1.5, away: 1.2 }, 
      signal: finalProb > config.football.over25Threshold ? 'STRONG_OVER' : 'NEUTRAL',
      details, isHotGame: isHot, spikeDetected: spikeInfo.detected, spikeDetails: spikeInfo.details
    };
  }

  if (match.sport === SportType.BASKETBALL) {
    const stats = match.stats as BasketballStats;
    const priorProb = 60 + (config.basketball.paceWeight * 10);
    let finalProb = priorProb;
    let details = "NBA PRE-GAME | Tendência High Scoring (Prior)";

    if (isLive) {
        let minutesPlayed = 0;
        const period = stats.currentPeriod;
        if (period.includes('Q1')) minutesPlayed = 6;
        else if (period.includes('Q2')) minutesPlayed = 18;
        else if (period.includes('Q3')) minutesPlayed = 30;
        else if (period.includes('Q4')) minutesPlayed = 42;
        
        const currentTotalScore = (stats.homeScore || 0) + (stats.awayScore || 0);
        const projectedPoints = (currentTotalScore / Math.max(minutesPlayed, 1)) * 48;
        const paceFactor = stats.pace ? (stats.pace / 99.5) : 1;
        const liveProjection = projectedPoints * paceFactor;
        const liveProb = (liveProjection > config.basketball.lineThreshold) ? 85 : 30;
        const matchProgress = Math.min(minutesPlayed / 48, 1);
        finalProb = calculateBayesianProbability(priorProb, liveProb, matchProgress);
        isHot = detectHotGame(SportType.BASKETBALL, stats);
        spikeInfo = detectSpikes(SportType.BASKETBALL, stats);
        details = `BAYESIAN NBA | Proj: ${Math.floor(liveProjection)} | Hot: ${isHot ? 'YES' : 'NO'}`;
    }

    return {
      matchId: match.id,
      calculatedProbability: Math.min(Math.max(finalProb, 0), 99),
      projectedPoints: 230,
      signal: finalProb > 65 ? 'STRONG_OVER' : (finalProb < 40 ? 'STRONG_UNDER' : 'NEUTRAL'),
      details, isHotGame: isHot, spikeDetected: spikeInfo.detected, spikeDetails: spikeInfo.details
    };
  }

  // Default fallback
  logger.warn("SCOUT", `Scout analysis fallback for match ${match.id} (Sport: ${match.sport})`);
  return {
    matchId: match.id,
    calculatedProbability: 55, 
    signal: 'NEUTRAL',
    details: 'Aguardando início...',
    isHotGame: false
  };
};
