
// engines/ScoutEngine.ts
import systemLogsService from "../services/systemLogsService";
import metricsService from "../services/metricsService";

class ScoutEngine {
    constructor() {
        systemLogsService.add("🔍 ScoutEngine inicializado.");
    }

    /** Normaliza qualquer estatística numérica */
    normalize(value: number, max: number) {
        if (!max || max === 0) return 0;
        return Math.min(1, value / max);
    }

    /** Analisa estatísticas de um time */
    analyzeTeamStats(stats: any) {
        systemLogsService.add("📊 ScoutEngine: Analisando estatísticas do time...");

        const {
            shotsOnTarget = 0,
            totalShots = 0,
            xG = 0,
            possession = 0,
            momentum = 0,
            attacks = 0,
            dangerousAttacks = 0,
        } = stats;

        const pressure =
            this.normalize(shotsOnTarget, 10) * 0.3 +
            this.normalize(attacks, 150) * 0.2 +
            this.normalize(dangerousAttacks, 50) * 0.25 +
            this.normalize(possession, 100) * 0.15 +
            this.normalize(momentum, 100) * 0.1;

        return {
            pressure: Number(pressure.toFixed(3)),
            efficiency: totalShots > 0 ? shotsOnTarget / totalShots : 0,
            xG,
            momentum,
        };
    }

    /** Analisa estatísticas de basquete */
    analyzeBasketballStats(stats: any) {
        systemLogsService.add("🏀 ScoutEngine: Analisando estatísticas de basquete...");

        const {
            pace = 0,
            fg = 0,
            fga = 0,
            turnovers = 0,
            offensiveRebounds = 0,
        } = stats;

        const efficiency = fga > 0 ? fg / fga : 0;

        return {
            efficiency: Number(efficiency.toFixed(3)),
            pace,
            turnovers,
            reboundRate: this.normalize(offensiveRebounds, 20),
        };
    }

    /** Analisa estatísticas de vôlei */
    analyzeVolleyballStats(stats: any) {
        systemLogsService.add("🏐 ScoutEngine: Analisando estatísticas de vôlei...");

        const {
            attackPoints = 0,
            blockPoints = 0,
            servePoints = 0,
            errors = 0,
        } = stats;

        return {
            attackPower: this.normalize(attackPoints, 40),
            blockPower: this.normalize(blockPoints, 20),
            servePower: this.normalize(servePoints, 15),
            discipline: 1 - this.normalize(errors, 20),
        };
    }

    /** Define força geral de qualquer entidade (time/jogador) */
    computePowerIndex(metrics: any) {
        systemLogsService.add("⚡ Gerando Power Index...");

        const {
            pressure = 0,
            efficiency = 0,
            momentum = 0,
            xG = 0,
        } = metrics;

        const power =
            pressure * 0.4 +
            efficiency * 0.25 +
            momentum * 0.2 +
            this.normalize(xG, 3) * 0.15;

        const result = Number(power.toFixed(3));

        metricsService.addMetric("power_index_generated", 1);
        return result;
    }
}

const scoutEngine = new ScoutEngine();
export default scoutEngine;
