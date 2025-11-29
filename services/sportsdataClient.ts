
// services/sportsdataClient.ts
// Cliente robusto para SportsDataIO v3
import { SportType } from "../types";
import { logger } from "../utils/logger";

const BASE_URL = "https://api.sportsdata.io/v3";
const DEFAULT_KEY = (typeof process !== "undefined" && process.env.SPORTSDATA_KEY) ? process.env.SPORTSDATA_KEY : "";
const RETRY_COUNT = 2;
const RETRY_DELAY_MS = 700;

async function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

async function safeFetch(url: string, init: RequestInit = {}) {
  let lastErr: any = null;
  for (let attempt = 0; attempt <= RETRY_COUNT; attempt++) {
    try {
      const res = await fetch(url, init);
      const text = await res.text().catch(() => "");
      let json = null;
      try { json = text ? JSON.parse(text) : null; } catch(e){ /* not json */ }

      if (!res.ok) {
        const msg = `HTTP ${res.status} ${res.statusText} — ${text || "<no body>"}`;
        lastErr = new Error(msg);
        if (res.status >= 500 && attempt < RETRY_COUNT) {
          logger.warn('API', `SportsData request failed (attempt ${attempt + 1}), retrying...`, { status: res.status });
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

function buildFinalUrl(league: string, endpointPath: string, key?: string) {
  const k = key || DEFAULT_KEY || "";
  if (!k) {
    logger.error('API', 'SPORTSDATA_KEY não configurada.');
    throw new Error("SPORTSDATA_KEY not provided.");
  }
  const ep = endpointPath.replace(/^\/+/, "").replace(/\s+/g, "");
  return `${BASE_URL}/${league}/scores/json/${ep}${ep.includes('?') ? '&' : '?'}key=${k}`.replace('?&','?');
}

export interface NBAGame { GameID: number; Season?: number; DateTime?: string; Status?: string; HomeTeam?: string; AwayTeam?: string; }
export interface NBAProjection { PlayerID: number; Name: string; Team: string; Opponent: string; Position: string; Points?: number; Rebounds?: number; Assists?: number; Steals?: number; Blocks?: number; Minutes?: number; }

async function get<T = any>(endpoint: string, league: string = 'nba', apiKey?: string): Promise<T> {
  const finalUrl = buildFinalUrl(league, endpoint, apiKey);
  logger.info('API', `[sportsdata] fetching: ${finalUrl.replace(apiKey || DEFAULT_KEY, '***')}`);
  const headers = { 'Accept': 'application/json', 'User-Agent': 'MonkeyTips-Worker/3.0' };
  const data = await safeFetch(finalUrl, { method: 'GET', headers });
  return data as T;
}

export const sportsdataClient = {
  async getNBAGamesByDate(date: string, apiKey?: string): Promise<NBAGame[]> {
    try {
      const res = await get<NBAGame[]>(`GamesByDate/${date}`, 'nba', apiKey);
      return Array.isArray(res) ? res : [];
    } catch (err) {
      logger.error('API', "[sportsdata] getNBAGamesByDate error", err);
      return [];
    }
  },

  async getNBAProjections(date: string, apiKey?: string): Promise<NBAProjection[]> {
    try {
      const res = await get<NBAProjection[]>(`PlayerGameProjectionStatsByDate/${date}`, 'nba', apiKey);
      return Array.isArray(res) ? res : [];
    } catch (err) {
      logger.error('API', "[sportsdata] getNBAProjections error", err);
      return [];
    }
  },

  async raw(endpointPath: string, league = 'nba', apiKey?: string) {
    try {
      return await get(endpointPath, league, apiKey);
    } catch (err) {
      logger.error('API', "[sportsdata] raw request error", err);
      throw err;
    }
  }
};
