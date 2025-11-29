
import { dbService } from '../services/databaseService';
import { fetchLiveFixtures, fetchMatchStatistics, fetchTeamHistory } from '../services/liveDataService';
import { logger } from '../utils/logger';
import { Match } from '../types';

// Declarações para evitar erros de tipagem em ambientes mistos (Node/Browser)
declare const require: any;
declare const module: any;

export const runFootballCollection = async () => {
  logger.info('F-BALL', 'Iniciando Coleta de Futebol...');
  const apiKey = typeof window !== 'undefined' ? localStorage.getItem('monkey_football_api_key') : undefined;

  if (!apiKey) {
    logger.error('F-BALL', 'API Key para Futebol não encontrada. Worker encerrado.');
    return;
  }

  try {
    const fixtures = await fetchLiveFixtures(apiKey);
    logger.info('F-BALL', `Encontrados ${fixtures.length} jogos para processar.`);

    const enrichedMatches: Match[] = [];

    for (const fixture of fixtures) {
      if (!fixture.externalId || !fixture.teamAId || !fixture.teamBId) continue;
      
      try {
        const [stats, homeHistory, awayHistory] = await Promise.all([
          fetchMatchStatistics(fixture.externalId, apiKey),
          fetchTeamHistory(fixture.teamAId, apiKey),
          fetchTeamHistory(fixture.teamBId, apiKey)
        ]);

        const enrichedFixture = { ...fixture };

        if (stats) {
          enrichedFixture.stats = { ...fixture.stats, ...stats };
        }
        if (homeHistory && awayHistory) {
          enrichedFixture.history = { home: homeHistory, away: awayHistory };
        }

        await dbService.saveMatch(enrichedFixture);
        enrichedMatches.push(enrichedFixture);
        logger.info('F-BALL', `Jogo ${fixture.id} (${fixture.teamA} vs ${fixture.teamB}) enriquecido e salvo.`);
        
        // Pequeno delay para evitar rate limiting da API
        await new Promise(res => setTimeout(res, 300));

      } catch (innerError) {
        logger.error('F-BALL', `Erro ao enriquecer jogo ${fixture.id}`, innerError);
      }
    }
    
    logger.info('F-BALL', `Coleta Finalizada. ${enrichedMatches.length} jogos processados com sucesso.`);

  } catch (error) {
    logger.error('F-BALL', 'Falha crítica na execução do worker de Futebol', error);
  }
};

// Permite execução via node (ex: node workers/collectFootball.ts)
if (typeof require !== 'undefined' && typeof module !== 'undefined' && require.main === module) {
    runFootballCollection().catch(e => logger.error('SYSTEM', 'Worker execution failed', e));
}
