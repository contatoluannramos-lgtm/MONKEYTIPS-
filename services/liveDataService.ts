
import { Match, SportType } from "../types";

// Endpoint padrão da API-Football (RapidAPI)
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

    // Pega a data de hoje no formato YYYY-MM-DD
    const today = new Date().toISOString().split('T')[0];

    // Busca TODOS os jogos do dia (Date) para garantir que sempre haja dados, 
    // mesmo que não haja jogos "Live" no exato segundo.
    const response = await fetch(`${API_URL}/fixtures?date=${today}`, requestOptions);
    
    if (!response.ok) {
      throw new Error(`Erro API: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.errors && Object.keys(data.errors).length > 0) {
        console.error("Erros da API:", data.errors);
        return [];
    }

    // Mapeia a resposta da API para o formato interno do Monkey Tips
    const matches: Match[] = data.response.map((item: any) => ({
      id: `live-${item.fixture.id}`,
      externalId: item.fixture.id,
      sport: SportType.FOOTBALL, // Focando em futebol para este endpoint
      teamA: item.teams.home.name,
      teamB: item.teams.away.name,
      league: item.league.name,
      startTime: item.fixture.date,
      // Mapeia status da API para o nosso
      status: ['1H', '2H', 'HT', 'ET', 'P', 'LIVE'].includes(item.fixture.status.short) ? 'Live' : 
              ['FT', 'AET', 'PEN'].includes(item.fixture.status.short) ? 'Finished' : 'Scheduled',
      stats: {
        homeScore: item.goals.home,
        awayScore: item.goals.away,
        currentMinute: item.fixture.status.elapsed,
        possession: 50, // Dados detalhados requerem chamadas adicionais na API Grátis
        shotsOnTarget: 0,
        recentForm: 'N/A'
      }
    }));

    return matches;

  } catch (error) {
    console.error("Falha ao buscar dados ao vivo:", error);
    return [];
  }
};
