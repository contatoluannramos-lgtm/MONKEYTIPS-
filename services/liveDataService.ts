import { Match, SportType, FootballStats } from "../types";

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

    // Busca jogos do dia
    const today = new Date().toISOString().split('T')[0];
    const response = await fetch(`${API_URL}/fixtures?date=${today}`, requestOptions);
    
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

// Função para buscar estatísticas detalhadas (Deep Data) de uma partida específica
// Chamada quando o Monkey Tips foca em um jogo no Dashboard
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

        // Helper para extrair valor do array de stats da API
        const getValue = (teamStats: any[], type: string) => {
            const stat = teamStats.find((s: any) => s.type === type);
            // API can return "50%" or 50. Ensure we parse it to int.
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