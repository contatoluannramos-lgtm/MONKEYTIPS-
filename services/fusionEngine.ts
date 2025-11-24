
import { Match, ScoutResult, FusionAnalysis, Tip } from "../types";

export const runFusionEngine = (
  match: Match, 
  scoutData: ScoutResult, 
  aiTip: Tip | null,
  newsImpactScore: number = 0 // Optional news impact (default 0)
): FusionAnalysis => {
  
  // 1. Base Confidence from Scout (Math - Bayesian Adjusted)
  let finalScore = scoutData.calculatedProbability;

  // 2. Adjust with AI Context (Unstructured Data: Injuries, News)
  if (aiTip) {
    if (scoutData.signal === 'STRONG_OVER' && aiTip.prediction.includes('Over')) {
      finalScore += 10;
    } 
    else if (scoutData.signal === 'STRONG_OVER' && aiTip.prediction.includes('Under')) {
      finalScore -= 15; // Penalidade maior por discordância
    }
  }

  // 3. Hot Game Boost
  // Se o jogo está pegando fogo (Hot), aumentamos a confiança do Over
  if (scoutData.isHotGame) {
      if (scoutData.signal.includes('OVER')) {
          finalScore += 5; // Boost extra para Over em jogo Hot
      }
  }

  // 4. News Engine Impact
  // Applies the impact from recent news (+30% to -30%)
  if (newsImpactScore !== 0) {
      finalScore += newsImpactScore;
  }

  // 5. Market Odds (EV Calculation)
  const impliedProb = aiTip ? (1 / aiTip.odds) * 100 : 50;
  const ev = finalScore - impliedProb;

  // 6. Confidence Level Definition
  let confidenceLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
  if (finalScore >= 80) confidenceLevel = 'HIGH';
  else if (finalScore >= 60) confidenceLevel = 'MEDIUM';

  let verdict: 'GREEN_LIGHT' | 'YELLOW_WARNING' | 'RED_ALERT' = 'RED_ALERT';
  
  // Critérios mais rigorosos para Green Light
  if (finalScore > 75 && ev > 5) verdict = 'GREEN_LIGHT';
  else if (finalScore > 60 && ev > 0) verdict = 'YELLOW_WARNING';

  return {
    matchId: match.id,
    scoutResult: scoutData,
    aiContext: aiTip ? aiTip.reasoning : "Sem análise de IA disponível.",
    finalConfidence: Math.min(Math.max(finalScore, 0), 99),
    confidenceLevel,
    ev: Number(ev.toFixed(2)),
    marketOdd: aiTip ? aiTip.odds : 0,
    verdict,
    newsImpactScore
  };
};
