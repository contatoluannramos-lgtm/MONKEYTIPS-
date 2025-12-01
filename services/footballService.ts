
// ======================================================================
// 🐒 Monkey Tips — FOOTBALL SERVICE (MODO CASCA)
// Versão casca: apenas redireciona para o motor real (FootballEngine v2)
// ======================================================================

import { FootballEngineV2 } from '../engines/FootballEngineV2'; 
// ⬆️ Quando criarmos o motor real, este import já estará correto.

// Tipagens mínimas (previne erros enquanto o motor real não chega)
export type FootballLiveInput = {
  matchId: string;
  league?: string;
  teamA?: string;
  teamB?: string;
  minute?: number;
  stats?: any;
};

export type FootballLiveOutput = {
  projection: any;
  probabilities: any;
  recommendation?: string;
};

class FootballServiceCasca {
  private engine: FootballEngineV2;

  constructor() {
    // instancia o motor novo (que você vai colar depois)
    this.engine = new FootballEngineV2();
  }

  // ========= REDIRECIONADOR PRINCIPAL =========
  async analisarAoVivo(input: FootballLiveInput): Promise<FootballLiveOutput> {
    return this.engine.processarAoVivo(input);
  }

  // ========= FUNÇÕES ANTIGAS (compatibilidade) =========
  async live(input: FootballLiveInput) {
    return this.analisarAoVivo(input);
  }

  async getProjection(input: FootballLiveInput) {
    return this.analisarAoVivo(input);
  }
}

export const footballService = new FootballServiceCasca();
