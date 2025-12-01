
// engines/fusionEngine.ts
// --- CASCA (Shell Mode) ---
// Este arquivo é apenas um wrapper que chama o motor real e centralizado.

import type { Match, ScoutResult, FusionAnalysis, Tip } from "../types";

// IMPORTA O MOTOR NOVO
// (Quando você criar o novo motor em /core/engines, este import já estará correto)
import { runFusionEngineCore } from "../core/engines/fusionEngineCore";

export const runFusionEngine = (
  match: Match,
  scoutData: ScoutResult,
  aiTip: Tip | null,
  newsImpactScore: number = 0
): FusionAnalysis => {
  return runFusionEngineCore(match, scoutData, aiTip, newsImpactScore);
};

