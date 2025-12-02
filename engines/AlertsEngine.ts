
// AlertsEngine.ts
// Sistema de alertas automáticos

export interface AlertsOutput {
  alerts: string[];
}

export function runAlertsEngine(data: any): AlertsOutput {
  const alerts: string[] = [];

  // Segurança contra dados indefinidos
  if (!data || typeof data !== "object") {
    return { alerts: ["Dados inválidos fornecidos ao AlertsEngine"] };
  }

  // Verificações individuais com fallback seguro
  if (typeof data.pressure === "number" && data.pressure > 120) {
    alerts.push("Pressão alta detectada");
  }

  if (typeof data.momentum === "number" && data.momentum > 80) {
    alerts.push("Momento forte do time analisado");
  }

  if (typeof data.risk === "number" && data.risk > 70) {
    alerts.push("Risco defensivo elevado");
  }
  
  return { alerts };
}

export default runAlertsEngine;