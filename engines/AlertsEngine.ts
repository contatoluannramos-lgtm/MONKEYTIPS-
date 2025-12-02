
// AlertsEngine.ts
// Sistema de alertas automáticos — Monkey Tips Fire v2.0
// Avalia pressão, momentum, risco e outros sinais do jogo.

export interface AlertsOutput {
  alerts: string[];
}

export interface AlertsInput {
  pressure?: number;
  momentum?: number;
  risk?: number;
  dominance?: number;
  dangerIndex?: number;
}

export function runAlertsEngine(data: AlertsInput): AlertsOutput {
  const alerts: string[] = [];

  if (!data || typeof data !== "object") {
    return { alerts: ["Dados inválidos fornecidos ao AlertsEngine"] };
  }

  const safe = (v: any) =>
    typeof v === "number" && !isNaN(v) ? v : undefined;

  const pressure = safe(data.pressure);
  const momentum = safe(data.momentum);
  const risk = safe(data.risk);
  const dominance = safe(data.dominance);
  const dangerIndex = safe(data.dangerIndex);

  // --- 1. Pressão ofensiva ---
  if (pressure !== undefined && pressure > 120) {
    alerts.push("Pressão ofensiva muito alta — tendência de gol iminente");
  }

  // --- 2. Momento do time ---
  if (momentum !== undefined && momentum > 80) {
    alerts.push("Momento forte do time analisado — vantagem crescente");
  }

  // --- 3. Risco defensivo ---
  if (risk !== undefined && risk > 70) {
    alerts.push("Risco defensivo elevado — possível gol sofrido");
  }

  // --- 4. Dominância geral (posse + chances + ritmo) ---
  if (dominance !== undefined && dominance > 75) {
    alerts.push("Alta dominância — jogo pendendo fortemente para um dos lados");
  }

  // --- 5. Índice de perigo (Fire Engine) ---
  if (dangerIndex !== undefined && dangerIndex > 65) {
    alerts.push("Perigo constante detectado — jogo aberto e agressivo");
  }

  return { alerts };
}

export default runAlertsEngine;