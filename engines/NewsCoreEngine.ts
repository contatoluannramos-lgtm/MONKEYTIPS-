
// NewsCoreEngine.ts
// Avaliação de notícias + impacto no jogo

export interface NewsOutput {
  relevance: number;
  impact: number;
  category: string;
  summary: string;
}

export function runNewsCoreEngine(text: string): NewsOutput {
  const lengthScore = Math.min(100, text.length / 2);

  return {
    relevance: lengthScore,
    impact: lengthScore * 0.7,
    category: lengthScore > 50 ? "alta" : "baixa",
    summary: "Notícia analisada com sucesso"
  };
}

export default runNewsCoreEngine;
