
// NewsCoreEngine.ts
// Kernel central de notícias — Monkey News Engine v2.1 (Fire Edition)
// Processa texto bruto, classifica, gera impacto e score final.

export interface NewsOutput {
  relevance: number;   // tamanho + densidade informacional (0–100)
  impact: number;      // impacto técnico direto (0–100)
  category: string;    // lesao, suspensao, clima, crise, mercado, neutra
  summary: string;     // resumo técnico do processamento
  newsScore: number;   // força total da notícia (0–100)
}

export function runNewsCoreEngine(text: string): NewsOutput {
  if (!text || typeof text !== "string") {
    return {
      relevance: 0,
      impact: 0,
      category: "neutra",
      summary: "Texto inválido recebido",
      newsScore: 0
    };
  }

  // --- 1. Limpeza básica ---
  const clean = text
    .replace(/[\n\r]+/g, " ")
    .replace(/[^a-zA-Z0-9á-úÁ-Úç ]/g, " ")
    .toLowerCase()
    .trim();

  // Quanto maior o texto, maior a relevância (densidade informativa)
  const lengthScore = Math.min(100, clean.length / 3);

  // --- 2. Classificação por palavras-chave ---
  let category = "neutra";
  let baseImpact = 10;

  const match = (r: RegExp) => r.test(clean);

  if (match(/les(ã|a)o|injury|machucado|desfalque/)) {
    category = "lesao";
    baseImpact = 70;

  } else if (match(/suspens(ã|a)o|cart(ã|a)o|banido/)) {
    category = "suspensao";
    baseImpact = 60;

  } else if (match(/clima|chuva|gramado|tempestade|vento/)) {
    category = "clima";
    baseImpact = 40;

  } else if (match(/crise|racha|briga|atrito|press(ã|a)o interna/)) {
    category = "crise";
    baseImpact = 75;

  } else if (match(/contrata(ç|c)ao|proposta|mercado/)) {
    category = "mercado";
    baseImpact = 30;
  }

  // --- 3. Impacto técnico ---
  const impact = Math.min(100, baseImpact + lengthScore * 0.4);

  // --- 4. Score final (ponderação Fire Edition) ---
  const newsScore = Math.round(impact * 0.65 + lengthScore * 0.35);

  return {
    relevance: lengthScore,
    impact,
    category,
    summary: "Notícia processada e classificada com sucesso",
    newsScore
  };
}

export default runNewsCoreEngine;