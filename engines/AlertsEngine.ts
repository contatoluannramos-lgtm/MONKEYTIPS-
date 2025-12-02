
// AlertsEngine.ts
// Sistema de alertas automáticos

export interface AlertsOutput {
  alerts: string[];
}

export function runAlertsEngine(data: any): AlertsOutput {
  const alerts: string[] = [];

  if (data.pressure > 120) alerts.push("Pressão alta detectada");
  if (data.momentum > 80) alerts.push("Momento forte do time analisado");
  if (data.risk > 70) alerts.push("Risco defensivo elevado");
  
  return { alerts };
}

export default runAlertsEngine;
