import { SportType } from "../types";

// Configurações do Cliente
const BASE_URL = "https://api.sportsdata.io/v3";
const DEFAULT_KEY = "a16dcb80ea4e4b549fd90ffea502f49a";

export interface NBAProjection {
  PlayerID: number;
  Name: string;
  Team: string;
  Opponent: string;
  Position: string;
  Points: number;
  Rebounds: number;
  Assists: number;
  Steals: number;
  BlockedShots: number;
  ThreePointersMade: number;
  FantasyPoints: number;
  Minutes: number;
  IsGameOver: boolean;
}

export interface NBAGame {
  GameID: number;
  Status: string; // Scheduled, Final, InProgress
  DateTime: string;
  AwayTeam: string;
  HomeTeam: string;
  AwayTeamScore: number | null;
  HomeTeamScore: number | null;
  PointSpread: number;
  OverUnder: number;
}

/**
 * Obtém a chave de API (Override > Ambiente > Default)
 */
const getKey = (overrideKey?: string): string => {
  if (overrideKey && overrideKey.length > 5) return overrideKey;
  if (typeof process !== 'undefined' && process.env.SPORTSDATA_KEY) {
    return process.env.SPORTSDATA_KEY;
  }
  return DEFAULT_KEY;
};

/**
 * Wrapper genérico para Fetch com tratamento de erro
 */
const get = async <T>(endpoint: string, league: 'nba' | 'soccer' = 'nba', apiKey?: string): Promise<T | null> => {
  const key = getKey(apiKey);
  
  // Constrói URLs baseadas no endpoint solicitado
  // Se for uma URL completa, apenas anexa a chave. Se for parcial, constrói o caminho.
  let finalUrl = '';
  
  if (endpoint.startsWith('http')) {
     finalUrl = `${endpoint}${endpoint.includes('?') ? '&' : '?'}key=${key}`;
  } else if (endpoint.includes('Projection')) {
     // Projections endpoint structure varies slightly
     finalUrl = `${BASE_URL}/${league}/projections/json/${endpoint}?key=${key}`;
  } else {
     // Standard scores endpoint
     finalUrl = `${BASE_URL}/${league}/scores/json/${endpoint}?key=${key}`;
  }

  console.log(`📡 [SportsDataIO] Fetching: ${endpoint.split('?')[0]}...`);

  try {
    const response = await fetch(finalUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'MonkeyTips-Worker/2.0'
      }
    });

    if (!response.ok) {
      console.error(`❌ [SportsDataIO] Error ${response.status}: ${response.statusText}`);
      if (response.status === 401 || response.status === 403) {
         console.error("⚠️ Verifique sua API KEY. Cota excedida ou chave inválida.");
      }
      return null;
    }

    const data = await response.json();
    return data as T;

  } catch (error) {
    console.error(`❌ [SportsDataIO] Network Error:`, error);
    return null;
  }
};

/**
 * Cliente Oficial Monkey Tips para SportsDataIO
 * Focado em operações de Backend/Worker
 */
export const sportsdataClient = {
  getKey,
  get,
  
  // --- MÉTODOS ESPECÍFICOS NBA ---

  /**
   * Busca jogos agendados para uma data (YYYY-MM-DD)
   */
  async getNBAGamesByDate(date: string, apiKey?: string): Promise<NBAGame[]> {
    const data = await get<NBAGame[]>(`GamesByDate/${date}`, 'nba', apiKey);
    return data || [];
  },

  /**
   * Busca projeções de jogadores para hoje
   */
  async getNBAProjections(date: string, apiKey?: string): Promise<NBAProjection[]> {
    // Endpoint específico de projeções
    return get<NBAProjection[]>(`PlayerGameProjectionStatsByDate/${date}`, 'nba', apiKey) || [];
  }
};