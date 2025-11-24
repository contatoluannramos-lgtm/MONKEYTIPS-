
import { Match, ScoutResult, FusionAnalysis, Tip } from "../types";

export const runFusionEngine = (
  match: Match, 
  scoutData: ScoutResult, 
  aiTip: Tip | null
): FusionAnalysis => {
  
  // 1. Base Confidence from Scout (Math)
  let finalScore = scoutData.calculatedProbability;

  // 2. Adjust with AI Context (Unstructured Data: Injuries, News)
  if (aiTip) {
    // Se a IA concorda com o Scout, aumenta a confiança
    if (scoutData.signal === 'STRONG_OVER' && aiTip.prediction.includes('Over')) {
      finalScore += 15;
    } 
    // Se discorda, penaliza
    else if (scoutData.signal === 'STRONG_OVER' && aiTip.prediction.includes('Under')) {
      finalScore -= 20;
    }
  }

  // 3. Market Odds (EV Calculation)
  // Se a odd for 2.00, a probabilidade implícita é 50%.
  // Se nosso Final Score for 70%, temos +20% de EV.
  const impliedProb = aiTip ? (1 / aiTip.odds) * 100 : 50;
  const ev = finalScore - impliedProb;

  let verdict: 'GREEN_LIGHT' | 'YELLOW_WARNING' | 'RED_ALERT' = 'RED_ALERT';
  
  if (finalScore > 75 && ev > 5) verdict = 'GREEN_LIGHT';
  else if (finalScore > 60 && ev > 0) verdict = 'YELLOW_WARNING';

  return {
    matchId: match.id,
    scoutResult: scoutData,
    aiContext: aiTip ? aiTip.reasoning : "Sem análise de IA disponível.",
    finalConfidence: Math.min(Math.max(finalScore, 0), 99),
    ev: Number(ev.toFixed(2)),
    marketOdd: aiTip ? aiTip.odds : 0,
    verdict
  };
};
