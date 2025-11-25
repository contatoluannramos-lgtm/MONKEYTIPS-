
import { Match, SportType, ScoutResult, CalibrationConfig, FootballStats, BasketballStats, VolleyballStats } from "../types";

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
    lineThreshold: 220 // Ajustado para média NBA
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

// Lógica Bayesiana: Pondera probabilidade histórica (Prior) vs dados ao vivo (Likelihood) baseada no tempo decorrido
const calculateBayesianProbability = (priorProb: number, liveProb: number, progress: number): number => {
    // Progress 0.0 a 1.0 (0% a 100% do tempo de jogo)
    // No início, Prior (Histórico) tem peso 1.0
    // No fim, Likelihood (Live) tem peso 0.8 (mantemos 0.2 de viés histórico para evitar overreaction a 1 lance)
    
    const liveWeight = Math.min(progress, 0.8);
    const priorWeight = 1.0 - liveWeight;
    
    return ((priorProb * priorWeight) + (liveProb * liveWeight));
};

// Detector de "Hot Game" (Jogo Quente/Frenético)
const detectHotGame = (sport: SportType, stats: any): boolean => {
    if (sport === SportType.BASKETBALL) {
        // NBA Hot: Pace > 102 ou placar muito alto no Q1 (> 60 pts combinados)
        const pace = stats.pace || 0;
        const q1Score = (stats.quarters?.q1?.home || 0) + (stats.quarters?.q1?.away || 0);
        return pace > 102 || q1Score > 60;
    }
    
    if (sport === SportType.FOOTBALL) {
        // Football Hot: Ataques perigosos > 1 por minuto ou muitos chutes
        const mins = Math.max(stats.currentMinute || 1, 1);
        const dangerousAttacks = stats.attacks?.dangerous || 0;
        const attacksPerMin = dangerousAttacks / mins;
        
        // > 0.8 ataques perigosos por minuto é pressão alta
        return attacksPerMin > 0.8;
    }

    if (sport === SportType.VOLLEYBALL) {
        // Vôlei Hot: Set decisivo ou Placar apertado no final (ex: 23-23)
        const home = stats.currentSetScore?.home || 0;
        const away = stats.currentSetScore?.away || 0;
        return (home > 20 || away > 20) && Math.abs(home - away) <= 2;
    }
    
    return false;
};

// Detector de Spikes (Picos de Mudança Repentina)
const detectSpikes = (sport: SportType, stats: any): { detected: boolean, details: string } => {
    if (sport === SportType.FOOTBALL) {
        // Detecta pressão absurda recente (ex: muitos ataques perigosos no tempo total vs tempo de jogo)
        // Idealmente precisaria de snapshots, mas vamos usar a densidade atual
        const mins = Math.max(stats.currentMinute || 1, 1);
        const dangerousAttacks = stats.attacks?.dangerous || 0;
        
        // Se a média de ataques perigosos for muito alta (> 1.5/min), assume-se um pico de pressão
        if ((dangerousAttacks / mins) > 1.5) {
            return { detected: true, details: 'PRESSURE STORM (1.5+ Att/Min)' };
        }
    }

    if (sport === SportType.BASKETBALL) {
        // Detecta "Run" (Sequência de pontos)
        // Se o Pace atual for absurdamente alto (> 110)
        if (stats.pace && stats.pace > 110) {
            return { detected: true, details: 'SCORING RUN DETECTED' };
        }
    }

    return { detected: false, details: '' };
};

export const runScoutAnalysis = (match: Match, config: CalibrationConfig): ScoutResult => {
  
  const isLive = match.status === 'Live';
  let isHot = false;
  let spikeInfo = { detected: false, details: '' };

  // --- FUTEBOL ---
  if (match.sport === SportType.FOOTBALL) {
    const stats = match.stats as FootballStats;
    
    // Probabilidade Base (Prior) baseada no Histórico
    const priorProb = 55 + (config.football.weightRecentForm * 10);
    
    let finalProb = priorProb;
    let details = "";

    if (isLive) {
        const homeGoals = stats.homeScore || 0;
        const corners = stats.corners?.total || 0;
        const estimatedXG = stats.xg ? (stats.xg.home + stats.xg.away) : (stats.shotsOnTarget.home + stats.shotsOnTarget.away) / 3;
        
        // Probabilidade Ao Vivo (Likelihood)
        const liveProb = (estimatedXG > 2.0 || (homeGoals + corners/5) > 1.5) ? 
                     (75 * config.football.poissonStrength) + 25 : 
                     30;
        
        // Ajuste Bayesiano
        const matchProgress = Math.min((stats.currentMinute || 0) / 90, 1);
        finalProb = calculateBayesianProbability(priorProb, liveProb, matchProgress);
        
        isHot = detectHotGame(SportType.FOOTBALL, stats);
        spikeInfo = detectSpikes(SportType.FOOTBALL, stats);
        
        details = `BAYESIAN | xG: ${estimatedXG.toFixed(1)} | Hot: ${isHot ? 'YES' : 'NO'}`;
    } else {
        details = "PRE-GAME | Scout baseado em Histórico (Prior)";
        finalProb = priorProb;
    }

    return {
      matchId: match.id,
      calculatedProbability: Math.min(finalProb, 99),
      expectedGoals: { home: 1.5, away: 1.2 }, 
      signal: finalProb > config.football.over25Threshold ? 'STRONG_OVER' : 'NEUTRAL',
      details: details,
      isHotGame: isHot,
      spikeDetected: spikeInfo.detected,
      spikeDetails: spikeInfo.details
    };
  }

  // --- BASQUETE (NBA SPECIALIST) ---
  if (match.sport === SportType.BASKETBALL) {
    const stats = match.stats as BasketballStats;
    
    // Configurações NBA
    const NBA_GAME_MINUTES = 48;
    const NBA_AVG_PACE = 99.5;
    
    // Prior Base
    const priorProb = 60 + (config.basketball.paceWeight * 10);
    let finalProb = priorProb;
    let details = "";

    if (isLive) {
        // Cálculo de Projeção NBA
        let minutesPlayed = 1;
        const period = stats.currentPeriod; 
        
        if (period.includes('Q1')) minutesPlayed = 6;
        else if (period.includes('Q2')) minutesPlayed = 18;
        else if (period.includes('Q3')) minutesPlayed = 30;
        else if (period.includes('Q4')) minutesPlayed = 42;
        
        const currentTotalScore = stats.homeScore + stats.awayScore;
        const projectedPoints = (currentTotalScore / Math.max(minutesPlayed, 1)) * NBA_GAME_MINUTES;
        const paceFactor = stats.pace ? (stats.pace / NBA_AVG_PACE) : 1;
        const liveProjection = projectedPoints * paceFactor;

        const liveProb = (liveProjection > config.basketball.lineThreshold) ? 85 : 30;
        
        // Ajuste Bayesiano para Basquete
        // Assumimos que Q1 tem menos peso, Q4 tem peso total
        const matchProgress = Math.min(minutesPlayed / 48, 1);
        finalProb = calculateBayesianProbability(priorProb, liveProb, matchProgress);

        isHot = detectHotGame(SportType.BASKETBALL, stats);
        spikeInfo = detectSpikes(SportType.BASKETBALL, stats);
        
        details = `BAYESIAN NBA | Proj: ${Math.floor(liveProjection)} | Hot: ${isHot ? 'YES' : 'NO'}`;
    } else {
        details = "NBA PRE-GAME | Tendência High Scoring (Prior)";
        finalProb = priorProb;
    }

    return {
      matchId: match.id,
      calculatedProbability: Math.min(Math.max(finalProb, 0), 99),
      projectedPoints: 230,
      signal: finalProb > 65 ? 'STRONG_OVER' : (finalProb < 40 ? 'STRONG_UNDER' : 'NEUTRAL'),
      details: details,
      isHotGame: isHot,
      spikeDetected: spikeInfo.detected,
      spikeDetails: spikeInfo.details
    };
  }

  // --- VÔLEI (CALIBRADO) ---
  if (match.sport === SportType.VOLLEYBALL) {
    const stats = match.stats as VolleyballStats;
    const priorProb = 50; 
    let finalProb = priorProb;
    let details = "PRE-GAME";

    if (isLive) {
        const setsPlayed = stats.homeScore + stats.awayScore;
        
        // Lógica de Sets: 2-2 = 100% chance de 5 sets (Over)
        // 1-1 = Alta chance de Over
        if (setsPlayed >= 4) finalProb = 95;
        else if (setsPlayed === 2 && stats.homeScore === 1) finalProb = 75;
        else finalProb = 50;

        // Aplicação do peso de Erros/Bloqueios da Calibragem
        // Se o jogo tem muitos erros, tende a sets mais longos
        if (stats.errors && (stats.errors.home + stats.errors.away) > 12) {
             finalProb += (config.volleyball.blockWeight * 10);
        }

        isHot = detectHotGame(SportType.VOLLEYBALL, stats);
        details = `SETS: ${stats.homeScore}-${stats.awayScore} | Hot: ${isHot ? 'YES' : 'NO'}`;
    }

    return {
        matchId: match.id,
        calculatedProbability: finalProb,
        signal: finalProb > 70 ? 'STRONG_OVER' : 'NEUTRAL',
        details: details,
        isHotGame: isHot,
        spikeDetected: false
    };
  }

  // --- HÓQUEI (SIMPLIFICADO) ---
  if (match.sport === SportType.ICE_HOCKEY) {
      // Placeholder logic using calibration weights
      const powerPlayFactor = config.iceHockey.powerPlayWeight * 100; // Ex: 40%
      return {
          matchId: match.id,
          calculatedProbability: 50 + (powerPlayFactor / 5),
          signal: 'NEUTRAL',
          details: 'PowerPlay Analysis Active',
          isHotGame: false
      };
  }
  
  // Default
  return {
    matchId: match.id,
    calculatedProbability: 55, 
    signal: 'NEUTRAL',
    details: 'Aguardando início...',
    isHotGame: false
  };
};
