
// PredictionEngine.ts
// Algoritmo de previsão de gols/escanteios/cartões/pontos

import { FusionOutput } from "./FusionEngine";

export interface PredictionOutput {
  goals: number;
  corners: number;
  cards: number;
  basketballPoints: number;
  confidence: number;
  summary: string;
}

export function runPredictionEngine(fusion: FusionOutput): PredictionOutput {
  const goals = (fusion.powerRating / 50) + (fusion.momentum / 80);
  const corners = fusion.scout.pace / 22;
  const cards = fusion.risk / 35;
  const basketballPoints = fusion.powerRating * 2.8;

  const confidence = Math.min(100, fusion.fusionScore);

  const summary = `Projeções estimadas com confiança ${confidence.toFixed(1)}%`;

  return {
    goals,
    corners,
    cards,
    basketballPoints,
    confidence,
    summary
  };
}

export default runPredictionEngine;
