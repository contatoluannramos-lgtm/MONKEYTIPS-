
// LiveEngine.ts
// Modo ao vivo completo — leitura + relatórios DanielScore

import { ScoutOutput } from "./ScoutEngine";
import { FusionOutput } from "./FusionEngine";
import { PredictionOutput } from "./PredictionEngine";

export interface LiveOutput {
  htProjection: number;
  ftProjection: number;
  teamProjection: { home: number; away: number };
  summary: string;
}

export function runLiveEngine(
  scout: ScoutOutput,
  fusion: FusionOutput,
  prediction: PredictionOutput
): LiveOutput {
  const ftProjection = prediction.goals * 1.8;
  const htProjection = prediction.goals * 0.9;

  return {
    htProjection,
    ftProjection,
    teamProjection: {
      home: ftProjection * 0.55,
      away: ftProjection * 0.45
    },
    summary: "Relatório LIVE gerado com sucesso"
  };
}

export default runLiveEngine;
