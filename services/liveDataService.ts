
import { Match, SportType, FootballStats, TeamHistory } from "../types";
import { sportsdataClient } from "./sportsdataClient";
import { logger } from "../utils/logger";

const API_HOST = "v3.football.api-sports.io";
const API_URL = "https://v3.football.api-sports.io";

// Helper para data local (Brasil/Sistema) YYYY-MM-DD
const getLocalDate = (addDays = 0) => {
    const date = new Date();
    date.setDate(date.getDate() + addDays);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// --- MOCK DATA (PROTOCOL FALLBACK) ---
const MOCK_FALLBACK_DATA: Match[] = [
    { id: 'mock-1', externalId: 1001, teamAId: 127, teamBId: 1062, sport: SportType.FOOTBALL, teamA: 'Flamengo', teamB: 'Palmeiras', league: 'Brasileirão Série A', startTime: new Date().toISOString(), status: 'Live', stats: { homeScore: 2, awayScore: 1, currentMinute: 75, possession: 62, corners: { home: 8, away: 3, total: 11 }, shotsOnTarget: { home: 6, away: 4 }, attacks: { dangerous: 45, total: 112 }, xg: { home: 2.1, away: 0.8 } } as FootballStats },
    { id: 'mock-2', externalId: 1002, sport: SportType.BASKETBALL, teamA: 'LA Lakers', teamB: 'Golden State Warriors', league: 'NBA', startTime: new Date(Date.now() + 3600000).toISOString(), status: 'Scheduled', stats: { homeScore: 0, awayScore: 0, currentPeriod: 'Pre-Game' } },
];

export const fetchLiveFixtures = async (apiKey: string): Promise<Match[]> => {
  if (!apiKey) {
    logger.warn("API", "API Key (futebol) ausente. Ativando Protocolo de Simulação.");
    return MOCK_FALLBACK_DATA;
  }

  try {
    const myHeaders = new Headers({ "x-rapidapi-key": apiKey, "x-rapidapi-host": API_HOST });
    const requestOptions: RequestInit = { method: 'GET', headers: myHeaders, redirect: 'follow' };
    const today = getLocalDate(0);
    const nextWeek = getLocalDate(7);

    logger.info("F-BALL", `Buscando jogos de ${today} até ${nextWeek}...`);

    let response = await fetch(`${API_URL}/fixtures?from=${today}&to=${nextWeek}`, requestOptions);
    let data = await response.json();

    if (!data.response || data.response.length === 0) {
        logger.warn("F-BALL", "Busca geral vazia. Tentando Brasileirão Série A...");
        response = await fetch(`${API_URL}/fixtures?league=71&season=2024&date=${today}`, requestOptions);
        data = await response.json();
    }
    if (!data.response || data.response.length === 0) {
        logger.warn("F-BALL", "Busca por liga vazia. Tentando Jogos Ao Vivo...");
        response = await fetch(`${API_URL}/fixtures?live=all`, requestOptions);
        data = await response.json();
    }

    if (data.errors && Object.keys(data.errors).length > 0) {
        logger.error("API", "Erros da API-Football:", data.errors);
        return MOCK_FALLBACK_DATA;
    }
    if (!data.response || data.response.length === 0) {
        logger.warn("API", "Nenhum jogo encontrado na API-Football. Retornando dados simulados.");
        return MOCK_FALLBACK_DATA;
    }

    const matches: Match[] = data.response.map((item: any) => ({
      id: `live-${item.fixture.id}`,
      externalId: item.fixture.id,
      teamAId: item.teams.home.id,
      teamBId: item.teams.away.id,
      sport: SportType.FOOTBALL,
      teamA: item.teams.home.name,
      teamB: item.teams.away.name,
      league: item.league.name,
      startTime: item.fixture.date,
      status: ['1H', '2H', 'HT', 'ET', 'P', 'LIVE'].includes(item.fixture.status.short) ? 'Live' : 
              ['FT', 'AET', 'PEN'].includes(item.fixture.status.short) ? 'Finished' : 'Scheduled',
      referee: item.fixture.referee,
      stats: { homeScore: item.goals.home ?? 0, awayScore: item.goals.away ?? 0, currentMinute: item.fixture.status.elapsed ?? 0 }
    }));

    logger.info("F-BALL", `✅ ${matches.length} partidas encontradas e processadas.`);
    return matches.length > 0 ? matches : MOCK_FALLBACK_DATA;
  } catch (error) {
    logger.error("API", "Falha crítica ao buscar dados de futebol", error);
    return MOCK_FALLBACK_DATA;
  }
};

export const fetchTeamHistory = async (teamId: number, apiKey: string): Promise<TeamHistory | null> => {
    if(!apiKey || !teamId) return null;
    try {
        const myHeaders = new Headers({ "x-rapidapi-key": apiKey, "x-rapidapi-host": API_HOST });
        const response = await fetch(`${API_URL}/fixtures?team=${teamId}&last=5&status=FT`, { method: 'GET', headers: myHeaders });
        if (!response.ok) return null;
        const data = await response.json();
        if (!data.response || data.response.length === 0) return null;

        const matches = data.response;
        let goalsFor = 0, goalsAgainst = 0, cleanSheets = 0, failedToScore = 0;
        const results: string[] = [];
        matches.forEach((m: any) => {
            const isHome = m.teams.home.id === teamId;
            const goalsScored = isHome ? m.goals.home : m.goals.away;
            const goalsConceded = isHome ? m.goals.away : m.goals.home;
            goalsFor += goalsScored;
            goalsAgainst += goalsConceded;
            if (goalsConceded === 0) cleanSheets++;
            if (goalsScored === 0) failedToScore++;
            if (goalsScored > goalsConceded) results.push('W');
            else if (goalsScored < goalsConceded) results.push('L');
            else results.push('D');
        });
        return { last5Results: results, avgGoalsFor: Number((goalsFor / matches.length).toFixed(2)), avgGoalsAgainst: Number((goalsAgainst / matches.length).toFixed(2)), cleanSheets, failedToScore };
    } catch (e) {
        logger.error("API", `Erro ao buscar histórico do time ${teamId}`, e);
        return null;
    }
};

export const fetchMatchStatistics = async (fixtureId: number, apiKey: string): Promise<Partial<FootballStats> | null> => {
    if(!apiKey) return null;
    try {
        const myHeaders = new Headers({ "x-rapidapi-key": apiKey, "x-rapidapi-host": API_HOST });
        const response = await fetch(`${API_URL}/fixtures/statistics?fixture=${fixtureId}`, { method: 'GET', headers: myHeaders });
        if (!response.ok) return null;
        const data = await response.json();
        if (!data.response || data.response.length < 2) return null;

        const getValue = (teamStats: any[], type: string) => parseInt(String(teamStats.find((s: any) => s.type === type)?.value || '0').replace('%', ''));
        const home = data.response[0].statistics;
        const away = data.response[1].statistics;
        return {
            possession: getValue(home, "Ball Possession"),
            corners: { home: getValue(home, "Corner Kicks"), away: getValue(away, "Corner Kicks"), total: getValue(home, "Corner Kicks") + getValue(away, "Corner Kicks") },
            shotsOnTarget: { home: getValue(home, "Shots on Goal"), away: getValue(away, "Shots on Goal") },
        };
    } catch (e) {
        logger.error("API", `Erro ao buscar deep stats para fixture ${fixtureId}`, e);
        return null;
    }
}

export const fetchRealTeamStats = async (teamId: string): Promise<{name: string, stat: string} | null> => {
    if (typeof window === 'undefined') return null;
    const apiKey = localStorage.getItem('monkey_football_api_key');
    if (!apiKey) return null;
    try {
        const myHeaders = new Headers({ "x-rapidapi-key": apiKey, "x-rapidapi-host": API_HOST });
        const fixturesRes = await fetch(`${API_URL}/fixtures?team=${teamId}&last=1&status=FT`, { headers: myHeaders });
        const fixturesData = await fixturesRes.json();
        if (!fixturesData.response?.[0]) return null;
        const fixture = fixturesData.response[0];
        const teamName = fixture.teams.home.id.toString() === teamId ? fixture.teams.home.name : fixture.teams.away.name;
        return { name: teamName, stat: `REAL DATA (${fixture.fixture.date.split('T')[0]} vs ${fixture.teams.home.id.toString() === teamId ? fixture.teams.away.name : fixture.teams.home.name})` };
    } catch (e) {
        logger.error("API", `Erro ao buscar dados reais do time ${teamId}`, e);
        return null;
    }
};

export const fetchSportsDataIOProps = async (apiKey?: string) => {
    const today = getLocalDate();
    const projections = await sportsdataClient.getNBAProjections(today, apiKey);
    if (!projections || projections.length === 0) return [];
    const relevantPlayers = projections.filter((p: any) => p.Minutes > 25 && p.Points > 15).slice(0, 5); 
    return relevantPlayers.map((p: any) => ({ entity: `${p.Name} (${p.Team})`, stat: `PROJ: ${p.Points} Pts, ${p.Rebounds} Reb, ${p.Assists} Ast. Opp: ${p.Opponent}.` }));
};

export const fetchRSSFeeds = async (source: 'GLOBO' | 'ESPN') => {
    const url = source === 'GLOBO' ? 'https://ge.globo.com/futebol/rss/' : 'https://www.espn.com.br/espn/rss/news';
    try {
        const response = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(url)}`);
        const data = await response.json();
        if (data.status === 'ok') {
            return data.items.map((item: any) => ({ title: item.title, link: item.link, description: item.description, pubDate: item.pubDate, source }));
        }
        return [];
    } catch (e) {
        logger.error("API", `Erro ao buscar RSS de ${source}`, e);
        return [];
    }
};

export const fetchPlayerStatsCrawler = async () => {
    logger.warn("SYSTEM", "Simulação de Crawler desativada. Retornando vazio.");
    return [];
};

export const testStatsProvider = async (apiKey?: string) => {
    try {
        const games = await sportsdataClient.getNBAGamesByDate(getLocalDate(), apiKey);
        return Array.isArray(games);
    } catch {
        return false;
    }
};
