
import { Match, ScoutResult, FusionAnalysis, Tip } from "../types";

export const runFusionEngine = (
  match: Match, 
  scoutData: ScoutResult, 
  aiTip: Tip | null,
  newsImpactScore: number = 0
): FusionAnalysis => {
  
  // 1. Base Confidence from Scout (Math - Bayesian Adjusted)
  let finalScore = scoutData.calculatedProbability;

  // 2. Adjust with AI Context (Unstructured Data: Injuries, News)
  if (aiTip) {
    if (scoutData.signal === 'STRONG_OVER' && aiTip.prediction.toLowerCase().includes('over')) {
      finalScore += 10;
    } 
    else if (scoutData.signal === 'STRONG_OVER' && aiTip.prediction.toLowerCase().includes('under')) {
      finalScore -= 15; // Penalidade maior por discordância
    }
  }

  // 3. Hot Game Boost
  if (scoutData.isHotGame && scoutData.signal.includes('OVER')) {
      finalScore += 5;
  }

  // 4. News Engine Impact
  finalScore += newsImpactScore;
  
  // 5. Market Odds (EV Calculation)
  const marketOdd = aiTip ? aiTip.odds : 1.90; // Default odd if not present
  const impliedProb = (1 / marketOdd) * 100;
  const ev = finalScore - impliedProb;

  // 6. Confidence Level Definition
  let confidenceLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
  if (finalScore >= 80) confidenceLevel = 'HIGH';
  else if (finalScore >= 60) confidenceLevel = 'MEDIUM';

  // 7. Final Verdict
  let verdict: 'GREEN_LIGHT' | 'YELLOW_WARNING' | 'RED_ALERT' = 'RED_ALERT';
  if (finalScore > 75 && ev > 5) verdict = 'GREEN_LIGHT';
  else if (finalScore > 60 && ev > 0) verdict = 'YELLOW_WARNING';

  return {
    matchId: match.id,
    scoutResult: scoutData,
    aiContext: aiTip ? aiTip.reasoning : "Sem análise de IA disponível.",
    finalConfidence: Math.min(Math.max(Math.round(finalScore), 0), 99),
    confidenceLevel,
    ev: Number(ev.toFixed(2)),
    marketOdd: marketOdd,
    verdict,
    newsImpactScore
  };
};
