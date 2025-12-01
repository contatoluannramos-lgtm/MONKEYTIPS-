
// ======================================================================
// 🏀 Monkey Tips — SportsData Client (v3) — MODO REVISADO
// Cliente robusto, resiliente e padronizado para integrar SportsDataIO.
// Mantém compatibilidade total com o painel atual.
// ======================================================================

import { logger } from "../utils/logger";

const BASE_URL = "https://api.sportsdata.io/v3";

// Key global (Workers & Node)
const DEFAULT_KEY =
  typeof process !== "undefined" && process.env?.SPORTSDATA_KEY
    ? process.env.SPORTSDATA_KEY
    : "";

// Tentativas automáticas
const RETRY_COUNT = 2;
const RETRY_DELAY_MS = 700;

async function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

// ================================================================
// SAFE FETCH COM RE-TENTATIVA
// ================================================================
async function safeFetch(url: string, init: RequestInit = {}) {
  let lastErr: any = null;

  for (let attempt = 0; attempt <= RETRY_COUNT; attempt++) {
    try {
      const res = await fetch(url, init);

      // Conteúdo sempre como texto, fallback para JSON
      const text = await res.text().catch(() => "");
      let json = null;

      try { json = text ? JSON.parse(text) : null; } catch {}

      // Se erro HTTP
      if (!res.ok) {
        const msg = `HTTP ${res.status} ${res.statusText} — ${text || "<no body>"}`;
        lastErr = new Error(msg);

        // Retentar se erro 500+
        if (res.status >= 500 && attempt < RETRY_COUNT) {
          logger.warn("API", `SportsData falhou (tentativa ${attempt + 1}), retry...`, { status: res.status });
          await sleep(RETRY_DELAY_MS);
          continue;
        }

        throw lastErr;
      }

      return json;
    } catch (err) {
      lastErr = err;
      if (attempt < RETRY_COUNT) await sleep(RETRY_DELAY_MS);
    }
  }

  throw lastErr;
}

// ================================================================
// MONTAGEM DA URL FINAL
// ================================================================
function buildFinalUrl(league: string, endpointPath: string, key?: string) {
  const k = key || DEFAULT_KEY || "";

  if (!k) {
    logger.error("API", "SPORTSDATA_KEY não configurada.");
    throw new Error("SPORTSDATA_KEY not provided.");
  }

  const ep = endpointPath.replace(/^\/+/, "").replace(/\s+/g, "");

  // scores/json sempre padrão da SportsData
  const base = `${BASE_URL}/${league}/scores/json/${ep}`;
  const final = `${base}${ep.includes("?") ? "&" : "?"}key=${k}`;

  return final.replace("?&", "?");
}

// ================================================================
// TIPOS MÍNIMOS (NBA)
// ================================================================
export interface NBAGame {
  GameID: number;
  Season?: number;
  DateTime?: string;
  Status?: string;
  HomeTeam?: string;
  AwayTeam?: string;
}

export interface NBAProjection {
  PlayerID: number;
  Name: string;
  Team: string;
  Opponent: string;
  Position: string;
  Points?: number;
  Rebounds?: number;
  Assists?: number;
  Steals?: number;
  Blocks?: number;
  Minutes?: number;
}

// ================================================================
// GET — Função base
// ================================================================
async function get<T = any>(endpoint: string, league: string = "nba", apiKey?: string): Promise<T> {
  const finalUrl = buildFinalUrl(league, endpoint, apiKey);

  logger.info(
    "API",
    `[sportsdata] GET: ${finalUrl.replace(apiKey || DEFAULT_KEY, "***")}`
  );

  const headers = {
    Accept: "application/json",
    "User-Agent": "MonkeyTips-Worker/3.0",
  };

  return (await safeFetch(finalUrl, { method: "GET", headers })) as T;
}

// ================================================================
// API PRINCIPAL
// ================================================================
export const sportsdataClient = {
  // Lista jogos do dia
  async getNBAGamesByDate(date: string, apiKey?: string): Promise<NBAGame[]> {
    try {
      const res = await get<NBAGame[]>(`GamesByDate/${date}`, "nba", apiKey);
      return Array.isArray(res) ? res : [];
    } catch (err) {
      logger.error("API", "[sportsdata] getNBAGamesByDate error", err);
      return [];
    }
  },

  // Projeções completas de jogadores
  async getNBAProjections(date: string, apiKey?: string): Promise<NBAProjection[]> {
    try {
      const res = await get<NBAProjection[]>(`PlayerGameProjectionStatsByDate/${date}`, "nba", apiKey);
      return Array.isArray(res) ? res : [];
    } catch (err) {
      logger.error("API", "[sportsdata] getNBAProjections error", err);
      return [];
    }
  },

  // Endpoint livre
  async raw(endpointPath: string, league = "nba", apiKey?: string) {
    try {
      return await get(endpointPath, league, apiKey);
    } catch (err) {
      logger.error("API", "[sportsdata] RAW request error", err);
      throw err;
    }
  },
};

