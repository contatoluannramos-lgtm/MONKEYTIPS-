
// PreTipsEngine.ts
// Pré-alertas projetivos (futebol, basquete e disciplina)

import { PredictionOutput } from "./PredictionEngine";

export interface PreTipsOutput {
  earlyGoal: number;
  earlyCorners: number;
  earlyCards: number;
  nbaEarlyOver: number;
  summary: string;
}

export function runPreTipsEngine(pred: PredictionOutput): PreTipsOutput {
  
  // --- FUTEBOL ---
  // Escala normalizada de 0 a 100 baseado em projeções reais
  const earlyGoal = Math.min(100, pred.goals * 48);       // 0.8 gols → ~38%
  const earlyCorners = Math.min(100, pred.corners * 60);  // ritmo rápido → alta chance
  const earlyCards = Math.min(100, pred.cards * 55);      // disciplina + risco

  // --- NBA ---
  // Usa projeção do PredictionEngine de forma coerente
  const nbaEarlyOver = Math.min(100, pred.basketballPoints * 1.1);

  const summary = 
    "Pré-tendências geradas com escala técnica (0–100%) baseada no modelo Prediction.";

  return {
    earlyGoal: Number(earlyGoal.toFixed(1)),
    earlyCorners: Number(earlyCorners.toFixed(1)),
    earlyCards: Number(earlyCards.toFixed(1)),
    nbaEarlyOver: Number(nbaEarlyOver.toFixed(1)),
    summary
  };
}

export default runPreTipsEngine;