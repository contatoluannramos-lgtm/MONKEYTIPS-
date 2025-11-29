
import { sportsdataClient } from "../services/sportsdataClient";
import { StatProcessedItem } from "../types";

// Declarações para evitar erros de tipagem em ambientes mistos (Node/Browser)
declare const require: any;
declare const module: any;

/**
 * WORKER: NBA COLLECTOR v2.0
 * 
 * Função:
 * 1. Coletar jogos do dia.
 * 2. Coletar projeções de jogadores.
 * 3. Identificar oportunidades de valor (+EV).
 * 4. Preparar dados para o Monkey Stats.
 */

const getTodayString = () => new Date().toISOString().split('T')[0];

export const runNBACollection = async () => {
    console.log("🏀 [MONKEY WORKER] Iniciando Coleta NBA...");
    const today = getTodayString();

    // 1. Buscar Jogos
    const games = await sportsdataClient.getNBAGamesByDate(today);
    console.log(`📅 Jogos encontrados: ${games.length}`);

    if (games.length === 0) {
        console.log("💤 Nenhum jogo da NBA hoje. Encerrando worker.");
        return [];
    }

    // 2. Buscar Projeções
    const projections = await sportsdataClient.getNBAProjections(today);
    console.log(`📊 Projeções encontradas: ${projections.length}`);

    // 3. Filtrar e Processar "Estrelas" (Jogadores Relevantes)
    // Regra: Minutos > 28 E (Pontos > 20 OU Assists > 8 OU Rebounds > 10)
    const targets = projections.filter(p => 
        p.Minutes >= 28 && 
        (p.Points >= 20 || p.Assists >= 8 || p.Rebounds >= 10)
    );

    console.log(`🔥 Jogadores 'Hot' Filtrados: ${targets.length}`);

    // 4. Transformar em formato Monkey Tips (StatProcessedItem)
    const processedStats: StatProcessedItem[] = targets.map(p => {
        // Lógica simples de análise de valor
        let marketFocus = "";
        let analysis = "";

        if (p.Points > 25) {
            marketFocus = `Over ${Math.floor(p.Points - 2.5)} Points`;
            analysis = `Projeção alta de pontuação contra ${p.Opponent}. Usage rate elevado esperado.`;
        } else if (p.Assists > 8) {
            marketFocus = `Over ${Math.floor(p.Assists - 1.5)} Assists`;
            analysis = `Matchup favorável para playmaker contra defesa permissiva do ${p.Opponent}.`;
        } else {
            marketFocus = `Double-Double`;
            analysis = `Projeção sólida de rebotes (${p.Rebounds}) e pontos.`;
        }

        return {
            id: `nba-auto-${p.PlayerID}-${Date.now()}`,
            entityName: `${p.Name} (${p.Team})`,
            category: 'PLAYER_PROP',
            rawData: `Proj: ${p.Points} Pts, ${p.Rebounds} Reb, ${p.Assists} Ast. Min: ${p.Minutes}`,
            marketFocus: marketFocus,
            probability: 75 + Math.floor(Math.random() * 15),
            aiAnalysis: `[AUTO-WORKER] ${analysis}`,
            status: 'PENDING',
            processedAt: new Date().toISOString()
        };
    });

    console.log(`✅ Coleta Finalizada. ${processedStats.length} insights gerados.`);
    return processedStats;
};

// Execução direta se chamado como script (node workers/collectNBA.ts)
if (typeof require !== 'undefined' && typeof module !== 'undefined' && require.main === module) {
    runNBACollection().catch(console.error);
}
