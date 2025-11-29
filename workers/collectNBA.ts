
import { sportsdataClient } from "../services/sportsdataClient";
import { StatProcessedItem } from "../types";
import { logger } from "../utils/logger";

// Declarações para evitar erros de tipagem em ambientes mistos (Node/Browser)
declare const require: any;
declare const module: any;

const getTodayString = () => new Date().toISOString().split('T')[0];

export const runNBACollection = async () => {
    logger.info("NBA", "Iniciando Coleta NBA...");
    const today = getTodayString();

    try {
        const [games, projections] = await Promise.all([
            sportsdataClient.getNBAGamesByDate(today),
            sportsdataClient.getNBAProjections(today)
        ]);

        logger.info("NBA", `Jogos: ${games.length} | Projeções: ${projections.length}`);

        if (games.length === 0 || projections.length === 0) {
            logger.warn("NBA", "Nenhum jogo ou projeção da NBA hoje. Encerrando worker.");
            return [];
        }

        const targets = projections.filter(p => 
            p.Minutes && p.Minutes >= 28 && 
            (p.Points && p.Points >= 20 || p.Assists && p.Assists >= 8 || p.Rebounds && p.Rebounds >= 10)
        );
        logger.info("NBA", `Jogadores 'Hot' Filtrados: ${targets.length}`);

        const processedStats: StatProcessedItem[] = targets.map(p => {
            let marketFocus = "N/A";
            let analysis = "Projeção padrão.";

            if (p.Points && p.Points > 25) {
                marketFocus = `Over ${Math.floor(p.Points - 2.5)} Points`;
                analysis = `Projeção alta de pontuação contra ${p.Opponent}.`;
            } else if (p.Assists && p.Assists > 8) {
                marketFocus = `Over ${Math.floor(p.Assists - 1.5)} Assists`;
                analysis = `Matchup favorável para playmaker contra ${p.Opponent}.`;
            } else if (p.Points && p.Rebounds) {
                marketFocus = `Double-Double`;
                analysis = `Projeção sólida de rebotes (${p.Rebounds}) e pontos (${p.Points}).`;
            }

            return {
                id: `nba-auto-${p.PlayerID}-${Date.now()}`,
                entityName: `${p.Name} (${p.Team})`,
                category: 'PLAYER_PROP',
                rawData: `Proj: ${p.Points} Pts, ${p.Rebounds} Reb, ${p.Assists} Ast. Min: ${p.Minutes}`,
                marketFocus,
                probability: 75 + Math.floor(Math.random() * 15),
                aiAnalysis: `[AUTO-WORKER] ${analysis}`,
                status: 'PENDING',
                processedAt: new Date().toISOString()
            };
        });

        logger.info("NBA", `✅ Coleta Finalizada. ${processedStats.length} insights gerados.`);
        return processedStats;
    } catch (error) {
        logger.error("NBA", "Falha crítica na execução do worker de NBA", error);
        return [];
    }
};

// Permite execução via node (ex: node workers/collectNBA.ts)
if (typeof require !== 'undefined' && typeof module !== 'undefined' && require.main === module) {
    runNBACollection().catch(e => logger.error('SYSTEM', 'Worker execution failed', e));
}
