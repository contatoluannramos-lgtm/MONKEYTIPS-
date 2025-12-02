
// NewsCoreEngine.ts
// Avaliação de notícias + impacto no jogo — Versão revisada (Monkey News Engine v2.0)

export interface NewsOutput {
  relevance: number;       // 0–100
  impact: number;          // 0–100
  category: string;        // lesão, suspensão, clima, crise, mercado, neutra
  summary: string;         // resumo técnico
  newsScore: number;       // impacto total (0–100)
}

export function runNewsCoreEngine(text: string): NewsOutput {

  // --- 1. Limpeza básica ---
  const clean = text
    .replace(/[\n\r]+/g, " ")
    .replace(/[^a-zA-Z0-9á-úÁ-Úç ]/g, " ")
    .toLowerCase()
    .trim();

  const lengthScore = Math.min(100, clean.length / 3);

  // --- 2. Classificação por palavras-chave ---
  let category = "neutra";
  let baseImpact = 10;

  if (clean.match(/les(ã|a)o|injury|machucado|desfalque/)) {
    category = "lesao";
    baseImpact = 70;
  } else if (clean.match(/suspens(ã|a)o|cart(ã|a)o|banido/)) {
    category = "suspensao";
    baseImpact = 60;
  } else if (clean.match(/clima|chuva|gramado|tempestade|vento/)) {
    category = "clima";
    baseImpact = 40;
  } else if (clean.match(/crise|racha|briga|atrito|pressao interna/)) {
    category = "crise";
    baseImpact = 75;
  } else if (clean.match(/contrata(ç|c)ao|proposta|mercado/)) {
    category = "mercado";
    baseImpact = 30;
  }

  // --- 3. Impacto técnico ---
  const impact = Math.min(100, (baseImpact + lengthScore * 0.4));

  // --- 4. Score final ---
  const newsScore = Math.round((impact * 0.6) + (lengthScore * 0.4));

  return {
    relevance: lengthScore,
    impact,
    category,
    summary: "Notícia processada e classificada com sucesso",
    newsScore
  };
}

export default runNewsCoreEngine;