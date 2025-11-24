
import { Match, SportType, FootballStats, TeamHistory } from "../types";

const API_HOST = "v3.football.api-sports.io";
const API_URL = "https://v3.football.api-sports.io";

export const fetchLiveFixtures = async (apiKey: string): Promise<Match[]> => {
  if (!apiKey) {
    console.warn("API Key ausente. Usando dados mockados.");
    return [];
  }

  try {
    const myHeaders = new Headers();
    myHeaders.append("x-rapidapi-key", apiKey);
    myHeaders.append("x-rapidapi-host", API_HOST);

    const requestOptions: RequestInit = {
      method: 'GET',
      headers: myHeaders,
      redirect: 'follow'
    };

    // Calcular datas para buscar a semana (Hoje até +7 dias)
    const today = new Date().toISOString().split('T')[0];
    const nextWeekDate = new Date();
    nextWeekDate.setDate(nextWeekDate.getDate() + 7);
    const nextWeek = nextWeekDate.toISOString().split('T')[0];

    // Busca jogos do intervalo (Semana)
    const response = await fetch(`${API_URL}/fixtures?from=${today}&to=${nextWeek}`, requestOptions);
    
    if (!response.ok) throw new Error(`Erro API: ${response.statusText}`);

    const data = await response.json();

    if (data.errors && Object.keys(data.errors).length > 0) {
        console.error("Erros da API:", data.errors);
        return [];
    }

    const matches: Match[] = data.response.map((item: any) => {
      // Basic Stats Mapping (Deep stats require separate call usually)
      const stats: FootballStats = {
        homeScore: item.goals.home ?? 0,
        awayScore: item.goals.away ?? 0,
        currentMinute: item.fixture.status.elapsed ?? 0,
        possession: 50, // Default until detailed fetch
        corners: { home: 0, away: 0, total: 0 },
        shotsOnTarget: { home: 0, away: 0 },
        shotsOffTarget: { home: 0, away: 0 },
        attacks: { dangerous: 0, total: 0 },
        cards: { yellow: 0, red: 0 },
        recentForm: 'N/A' // Requires separate endpoint
      };

      return {
        id: `live-${item.fixture.id}`,
        externalId: item.fixture.id,
        teamAId: item.teams.home.id, // Captura ID do time
        teamBId: item.teams.away.id, // Captura ID do time
        sport: SportType.FOOTBALL,
        teamA: item.teams.home.name,
        teamB: item.teams.away.name,
        league: item.league.name,
        startTime: item.fixture.date,
        status: ['1H', '2H', 'HT', 'ET', 'P', 'LIVE'].includes(item.fixture.status.short) ? 'Live' : 
                ['FT', 'AET', 'PEN'].includes(item.fixture.status.short) ? 'Finished' : 'Scheduled',
        stats: stats
      };
    });

    return matches;

  } catch (error) {
    console.error("Falha ao buscar dados ao vivo:", error);
    return [];
  }
};

// Busca histórico dos últimos 5 jogos de um time
export const fetchTeamHistory = async (teamId: number, apiKey: string): Promise<TeamHistory | null> => {
    if(!apiKey || !teamId) return null;

    try {
        const myHeaders = new Headers();
        myHeaders.append("x-rapidapi-key", apiKey);
        myHeaders.append("x-rapidapi-host", API_HOST);

        // Busca últimos 5 jogos FINALIZADOS
        const response = await fetch(`${API_URL}/fixtures?team=${teamId}&last=5&status=FT`, {
            method: 'GET',
            headers: myHeaders
        });

        if (!response.ok) return null;
        const data = await response.json();
        
        if (!data.response || data.response.length === 0) return null;

        const matches = data.response;
        
        let goalsFor = 0;
        let goalsAgainst = 0;
        let cleanSheets = 0;
        let failedToScore = 0;
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

        return {
            last5Results: results,
            avgGoalsFor: Number((goalsFor / matches.length).toFixed(2)),
            avgGoalsAgainst: Number((goalsAgainst / matches.length).toFixed(2)),
            cleanSheets,
            failedToScore
        };

    } catch (e) {
        console.error("Erro ao buscar histórico do time", e);
        return null;
    }
};

export const fetchMatchStatistics = async (fixtureId: number, apiKey: string): Promise<Partial<FootballStats> | null> => {
    if(!apiKey) return null;

    try {
        const myHeaders = new Headers();
        myHeaders.append("x-rapidapi-key", apiKey);
        myHeaders.append("x-rapidapi-host", API_HOST);

        const response = await fetch(`${API_URL}/fixtures/statistics?fixture=${fixtureId}`, {
            method: 'GET',
            headers: myHeaders
        });

        if (!response.ok) return null;
        const data = await response.json();
        
        if (!data.response || data.response.length === 0) return null;

        const getValue = (teamStats: any[], type: string) => {
            const stat = teamStats.find((s: any) => s.type === type);
            return stat && stat.value !== null ? parseInt(String(stat.value).replace('%', '')) : 0;
        };

        const home = data.response[0].statistics;
        const away = data.response[1].statistics;

        return {
            possession: getValue(home, "Ball Possession") || 50,
            corners: {
                home: getValue(home, "Corner Kicks"),
                away: getValue(away, "Corner Kicks"),
                total: getValue(home, "Corner Kicks") + getValue(away, "Corner Kicks")
            },
            shotsOnTarget: {
                home: getValue(home, "Shots on Goal"),
                away: getValue(away, "Shots on Goal")
            },
            shotsOffTarget: {
                home: getValue(home, "Shots off Goal"),
                away: getValue(away, "Shots off Goal")
            },
            cards: {
                yellow: getValue(home, "Yellow Cards") + getValue(away, "Yellow Cards"),
                red: getValue(home, "Red Cards") + getValue(away, "Red Cards")
            }
        };

    } catch (e) {
        console.error("Erro ao buscar deep stats", e);
        return null;
    }
}
