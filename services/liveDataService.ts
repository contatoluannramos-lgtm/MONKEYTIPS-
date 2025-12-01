
// services/liveDataService.ts

// Serviço responsável por integrar dados ao vivo.
// Esta camada apenas encaminha solicitações para os módulos dedicados,
// como ScoutEngine e SportsDataClient.

// IMPORTANTE: Este arquivo não deve apontar para motores unificados.
// Ele permanece como compatibilidade com versões antigas do painel.

import { getLiveMatchData } from "./sportsdataClient";
import { analyzeLiveMatch } from "./scoutEngine";

export async function fetchLiveData(matchId: string) {
    const data = await getLiveMatchData(matchId);
    return analyzeLiveMatch(data);
}

