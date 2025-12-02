
// PreTipsEngine.ts
// Pré-alertas baseados em ritmo + projeções

import { PredictionOutput } from "./PredictionEngine";

export interface PreTipsOutput {
  earlyGoal: number;
  earlyCorners: number;
  earlyCards: number;
  nbaEarlyOver: number;
  summary: string;
}

export function runPreTipsEngine(pred: PredictionOutput): PreTipsOutput {
  return {
    earlyGoal: pred.goals * 65,
    earlyCorners: pred.corners * 50,
    earlyCards: pred.cards * 40,
    nbaEarlyOver: pred.basketballPoints / 2,
    summary: "Pré-tendências geradas"
  };
}

export default runPreTipsEngine;
