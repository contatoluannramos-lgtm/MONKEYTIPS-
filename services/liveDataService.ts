
import { Match, SportType, FootballStats, TeamHistory } from "../types";

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

    const today = getLocalDate(0);
    const nextWeek = getLocalDate(7);

    console.log(`📡 Buscando jogos de ${today} até ${nextWeek}...`);

    // TENTATIVA 1: Busca Geral da Semana
    let response = await fetch(`${API_URL}/fixtures?from=${today}&to=${nextWeek}`, requestOptions);
    let data = await response.json();

    // TENTATIVA 2: Se vazio, busca especificamente BRASILEIRÃO (71) para hoje
    if (!data.response || data.response.length === 0) {
        console.warn("⚠️ Busca geral vazia. Tentando Brasileirão Série A...");
        // 71 = Brasileirão Série A, 2024 (Hardcoded year fallback, ideally dynamic)
        response = await fetch(`${API_URL}/fixtures?league=71&season=2024&date=${today}`, requestOptions);
        data = await response.json();
    }

    // TENTATIVA 3: Se ainda vazio, busca TUDO que está AO VIVO agora
    if (!data.response || data.response.length === 0) {
        console.warn("⚠️ Busca por liga vazia. Tentando Jogos Ao Vivo (Live All)...");
        response = await fetch(`${API_URL}/fixtures?live=all`, requestOptions);
        data = await response.json();
    }

    if (data.errors && Object.keys(data.errors).length > 0) {
        console.error("❌ Erros da API:", data.errors);
        // Retorna array vazio mas loga erro para debug
        return [];
    }

    if (!data.response) return [];

    const matches: Match[] = data.response.map((item: any) => {
      // Mapeamento básico de stats
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
        recentForm: 'N/A'
      };

      return {
        id: `live-${item.fixture.id}`,
        externalId: item.fixture.id,
        teamAId: item.teams.home.id,
        teamBId: item.teams.away.id,
        sport: SportType.FOOTBALL, // API default is football
        teamA: item.teams.home.name,
        teamB: item.teams.away.name,
        league: item.league.name,
        startTime: item.fixture.date,
        // Normaliza status para o sistema
        status: ['1H', '2H', 'HT', 'ET', 'P', 'LIVE'].includes(item.fixture.status.short) ? 'Live' : 
                ['FT', 'AET', 'PEN'].includes(item.fixture.status.short) ? 'Finished' : 'Scheduled',
        referee: item.fixture.referee,
        stats: stats
      };
    });

    console.log(`✅ ${matches.length} partidas encontradas.`);
    return matches;

  } catch (error) {
    console.error("❌ Falha crítica ao buscar dados:", error);
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

// --- NEWS FEED CRAWLER (RSS BRIDGE) ---
export const fetchRSSFeeds = async (source: 'GLOBO' | 'ESPN') => {
    // Usamos RSS2JSON para contornar limitações de CORS em ambiente frontend puro
    const url = source === 'GLOBO' 
        ? 'https://ge.globo.com/futebol/rss/' 
        : 'https://www.espn.com.br/espn/rss/news';
    
    try {
        const response = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(url)}`);
        const data = await response.json();
        
        if (data.status === 'ok') {
            return data.items.map((item: any) => ({
                title: item.title,
                link: item.link,
                description: item.description,
                pubDate: item.pubDate,
                source: source
            }));
        }
        return [];
    } catch (e) {
        console.error("RSS Fetch Error", e);
        return [];
    }
};

// --- MONKEY STATS CRAWLER (SIMULATION) ---
// Simula a coleta de estatísticas profundas de sites como SofaScore/FlashScore
// Em produção, isso seria um proxy backend chamando esses sites.
export const fetchPlayerStatsCrawler = async () => {
    // Mock de resposta do Crawler
    const crawledData = [
        {
            entity: "G. Cano (Fluminense)",
            stat: "6 Finalizações no último jogo, 4 no alvo. xG acumulado de 1.2 sem marcar.",
            source: "SofaScore"
        },
        {
            entity: "Hulk (Atlético-MG)",
            stat: "Média de 3.5 faltas sofridas por jogo. Árbitro do próximo jogo tem média de 28 faltas/jogo.",
            source: "FlashScore"
        },
        {
            entity: "Palmeiras (Team)",
            stat: "14 Escanteios no último jogo. Média de 8.2 cantos a favor jogando em casa.",
            source: "API-Football"
        },
        {
            entity: "LeBron James (Lakers)",
            stat: "Últimos 3 jogos: 28, 32, 30 pontos. Usage Rate aumentou 5% sem Anthony Davis.",
            source: "NBA.com"
        },
        {
            entity: "Raphael Veiga (Palmeiras)",
            stat: "Cobrou 4 de 5 pênaltis nesta temporada. Média de 2 passes decisivos por jogo.",
            source: "FootStats"
        }
    ];

    // Simula delay de rede
    await new Promise(resolve => setTimeout(resolve, 1500));
    return crawledData;
};
