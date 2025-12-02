
// engines/FusionEngine.ts
// Monkey Tips Fire — Fusion Engine v3.0
// Combinação oficial das fontes: Scout + AI + Mercado + Notícias

import { Match, ScoutResult, FusionAnalysis, Tip } from "../types";
import { logger } from "../utils/logger";

// -----------------------------
// NORMALIZAÇÃO
// -----------------------------
function normalize(value: number, max: number) {
  return Math.min(Math.max(value / max, 0), 1);
}

// -----------------------------
// PESOS DO FUSION ENGINE (v3.0)
// -----------------------------
const WEIGHTS = {
  scout: 0.55,
  ai: 0.20,
  news: 0.10,
  market: 0.15,
};

export const runFusionEngine = (
  match: Match,
  scoutData: ScoutResult,
  aiTip: Tip | null,
  newsImpactScore: number = 0
): FusionAnalysis => {

  logger.info("FUSION", `Running FusionEngine for match ${match.id}`);

  // -----------------------------------
  // 1) BASE: SCOUT ENGINE — (55% peso)
  // -----------------------------------
  const nScout = normalize(scoutData.calculatedProbability, 100);

  // -----------------------------------
  // 2) AI TIP — (20% peso)
  // -----------------------------------
  let aiBoost = 0;
  let aiText = "Sem análise de IA disponível.";

  if (aiTip) {
    aiText = aiTip.reasoning;

    const pred = aiTip.prediction.toLowerCase();

    if (scoutData.signal.includes("OVER") && pred.includes("over")) {
      aiBoost = 12; // concordância forte
    } else if (scoutData.signal.includes("UNDER") && pred.includes("under")) {
      aiBoost = 10;
    } else {
      aiBoost = -14; // desacordo penalizado
    }
  }
  const nAI = normalize(aiBoost, 25);

  // -----------------------------------
  // 3) NEWS ENGINE — (10% peso)
  // -----------------------------------
  const nNews = normalize(newsImpactScore, 20);

  // -----------------------------------
  // 4) MARKET/Odds — (15% peso)
  // -----------------------------------
  const marketOdd = aiTip?.odds ?? 1.90;
  const impliedProb = (1 / marketOdd) * 100;
  const ev = scoutData.calculatedProbability - impliedProb;

  const nMarket = normalize(ev + 10, 30); // faixa média de EV ajustado

  // -----------------------------------
  // 5) FUSION SCORE FINAL
  // Fórmula híbrida (todos os pesos aplicados)
  // -----------------------------------
  const fusionScore =
    (nScout * 100 * WEIGHTS.scout) +
    (nAI * 100 * WEIGHTS.ai) +
    (nNews * 100 * WEIGHTS.news) +
    (nMarket * 100 * WEIGHTS.market);

  const finalConfidence = Math.round(Math.min(Math.max(fusionScore, 0), 100));

  // -----------------------------------
  // 6) LEVEL DE CONFIANÇA
  // -----------------------------------
  let confidenceLevel: "LOW" | "MEDIUM" | "HIGH" = "LOW";
  if (finalConfidence >= 78) confidenceLevel = "HIGH";
  else if (finalConfidence >= 60) confidenceLevel = "MEDIUM";

  // -----------------------------------
  // 7) VERDICT (GREEN / YELLOW / RED)
  // -----------------------------------
  let verdict: "GREEN_LIGHT" | "YELLOW_WARNING" | "RED_ALERT" = "RED_ALERT";

  if (finalConfidence > 80 && ev > 4) verdict = "GREEN_LIGHT";
  else if (finalConfidence > 65 && ev > 0) verdict = "YELLOW_WARNING";

  // -----------------------------------
  // 8) OUTPUT FINAL
  // -----------------------------------
  const result: FusionAnalysis = {
    matchId: match.id,
    scoutResult: scoutData,
    aiContext: aiText,
    finalConfidence,
    confidenceLevel,
    ev: Number(ev.toFixed(2)),
    marketOdd,
    verdict,
    newsImpactScore,
    fusionScore: finalConfidence,
    powerRating: scoutData.powerRating ?? 50,   // compatível com PredictionEngine
    momentum: scoutData.momentum ?? 50,
    risk: scoutData.risk ?? 40,
  };

  logger.info("FUSION", `FusionEngine Final Verdict: ${verdict}`, { finalConfidence, ev });

  return result;
};