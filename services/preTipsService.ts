
// services/preTipsService.ts

import { predictionService } from "./predictionService";
import { scoutEngineService } from "./scoutEngineService";
import { fusionEngineService } from "./fusionEngineService";

export interface PreTipInput {
    sport: "football" | "basketball";
    metric: string;        // ex: "escanteios", "gols", "pace", "totalPoints"
    value: number;         // valor atual da métrica
    minute: number;        // minuto atual do jogo
    odds?: number;
}

export interface PreTipResult {
    sport: string;
    metric: string
