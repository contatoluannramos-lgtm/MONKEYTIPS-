
// engines/PredictionEngine.ts
// Monkey Tips Fire — Prediction Engine v3.0
// Cálculo profissional de projeções para Futebol e Basquete

import { FusionOutput } from "./FusionEngine";

export interface TeamProjection {
  home: number;
  away: number;
}

export interface PredictionOutput {
  football: {
    goalsFT: TeamProjection;
    goalsHT: TeamProjection;
    corners: number;
    cards: number;
  };
  basketball: {
    totalPoints: number;
    teamPoints: TeamProjection;
    pace: number;
  };
  confidence: number;
  summary: string;
}

export function runPredictionEngine(fusion: FusionOutput): PredictionOutput {
  // -----------------------------
  // VALIDATION
  // -----------------------------
  if (!fusion || !fusion.scout) {
    throw new Error("PredictionEngine: FusionOutput inválido.");
  }

  // -----------------------------
  // NORMALIZAÇÕES BASEADAS EM MÉDIAS GLOBAIS
  // -----------------------------
  const nPower = fusion.powerRating / 100;         // 0–1
  const nMomentum = fusion.momentum / 100;         // 0–1
  const nRisk = fusion.risk / 100;                 // 0–1
  const nPace = fusion.scout.pace / 100;           // 0–1

  // -----------------------------
  // ⚽ FUTEBOL — PROJEÇÃO DE GOLS
  // Modelo: (Power + Momentum + Pace ofensivo) ajustado pelo FusionScore
  // -----------------------------
  const baseGoalRate = 0.8 + (nPower * 0.6) + (nMomentum * 0.5);
  const adjustedGoalRate = baseGoalRate * (fusion.fusionScore / 80);

  const htGoalsTotal = adjustedGoalRate * 0.45;
  const ftGoalsTotal = adjustedGoalRate;

  const footballGoalsHT: TeamProjection = {
    home: htGoalsTotal * 0.55,
    away: htGoalsTotal * 0.45,
  };

  const footballGoalsFT: TeamProjection = {
    home: ftGoalsTotal * 0.55,
    away: ftGoalsTotal * 0.45,
  };

  // -----------------------------
  // ⚽ FUTEBOL — ESCANTEIOS
  // Fórmula baseada em Pace + Pressão + Volume ofensivo
  // -----------------------------
  const corners = (fusion.scout.pace * 0.06) + (fusion.momentum * 0.03);

  // -----------------------------
  // ⚽ FUTEBOL — CARTÕES
  // Level de risco + intensidade + arbitragem futura (placeholder)
  // -----------------------------
  const cards = (nRisk * 3.2) + (fusion.momentum * 0.015);

  // -----------------------------
  // 🏀 BASQUETE — PROJEÇÃO DE PONTOS
  // Modelo Monkey Tips Fire baseado em Pace + PowerRating
  // -----------------------------
  const totalBasketPoints = (fusion.powerRating * 1.1) + (fusion.scout.pace * 1.4);

  const teamBasketPoints: TeamProjection = {
    home: totalBasketPoints * 0.52,
    away: totalBasketPoints * 0.48,
  };

  // -----------------------------
  // CONFIANÇA GERAL DA PROJEÇÃO
  // -----------------------------
  const confidence = Math.min(100, fusion.fusionScore * 1.15);

  // -----------------------------
  // RESUMO PROFISSIONAL
  // -----------------------------
  const summary = `Projeções geradas com confiança ${confidence.toFixed(
    1
  )}% (Monkey Tips Fire v3.0)`;

  // -----------------------------
  // OUTPUT FINAL
  // -----------------------------
  return {
    football: {
      goalsFT: footballGoalsFT,
      goalsHT: footballGoalsHT,
      corners,
      cards,
    },
    basketball: {
      totalPoints: totalBasketPoints,
      teamPoints: teamBasketPoints,
      pace: fusion.scout.pace,
    },
    confidence,
    summary,
  };
}

export default runPredictionEngine;