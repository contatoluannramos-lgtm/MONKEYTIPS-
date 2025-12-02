
// LiveEngine.ts
// Modo ao vivo completo — leitura + relatórios DanielScore

import { ScoutOutput } from "./ScoutEngine";
import { FusionOutput } from "./FusionEngine";
import { PredictionOutput } from "./PredictionEngine";

export interface LiveOutput {
  htProjection: number;
  ftProjection: number;
  teamProjection: { home: number; away: number };
  confidence: number;
  pressureIndex: number;
  summary: string;
}

export function runLiveEngine(
  scout: ScoutOutput,
  fusion: FusionOutput,
  prediction: PredictionOutput
): LiveOutput {
  
  // 🔒 Validação base — evita crashes
  if (!prediction || typeof prediction.goals !== "number") {
    return {
      htProjection: 0,
      ftProjection: 0,
      teamProjection: { home: 0, away: 0 },
      confidence: 0,
      pressureIndex: 0,
      summary: "ERRO: Dados insuficientes no PredictionEngine"
    };
  }

  // -------------------------
  // 📌 PROJEÇÕES PRINCIPAIS
  // -------------------------

  const ftProjection = prediction.goals * 1.8;
  const htProjection = prediction.goals * 0.9;

  // -------------------------
  // 📌 PROJEÇÃO POR TIME
  // (baseado no Fusion + Scout)
  // -------------------------

  const attackBalance = fusion?.attackRatio ?? 0.55;
  const awayBalance = 1 - attackBalance;

  const homeProj = Number((ftProjection * attackBalance).toFixed(2));
  const awayProj = Number((ftProjection * awayBalance).toFixed(2));

  // -------------------------
  // 📌 PRESSURE INDEX (DanielScore)
  // -------------------------

  const pressureIndex = Math.min(
    100,
    ((scout?.pressure || 0) * 0.6) + ((fusion?.momentum || 0) * 0.4)
  );

  // -------------------------
  // 📌 CONFIDENCE LEVEL
  // -------------------------

  const confidence = Math.min(
    100,
    50 +
      (fusion?.confidence || 0) * 0.3 +
      (scout?.accuracy || 0) * 0.2
  );

  // -------------------------
  // 📌 SUMMARY — padrão Fire Model
  // -------------------------

  const summary = 
    `LIVE REPORT ✓ — DanielScore ativo\n` +
    `• FT Projection: ${ftProjection.toFixed(2)}\n` +
    `• HT Projection: ${htProjection.toFixed(2)}\n` +
    `• Home: ${homeProj} | Away: ${awayProj}\n` +
    `• Pressure Index: ${pressureIndex.toFixed(1)}\n` +
    `• Confidence: ${confidence.toFixed(1)}%\n` +
    `Engine Fusion + Scout + Prediction sincronizados.`;


  return {
    htProjection,
    ftProjection,
    teamProjection: {
      home: homeProj,
      away: awayProj
    },
    confidence,
    pressureIndex,
    summary
  };
}

export default runLiveEngine;