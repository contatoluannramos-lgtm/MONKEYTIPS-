
// engines/ScoutEngine.ts
// ScoutEngine — análise estatística e geração de ScoutResult
// Produz o objeto padrão usado pelo FusionEngine / PredictionEngine

import systemLogsService from "../services/systemLogsService";
import metricsService from "../services/metricsService";
import { Match, SportType } from "../types";

/**
 * ScoutResult — saída padrão do Scout Engine
 */
export interface ScoutResult {
  matchId?: string;
  teamId?: number | string;
  calculatedProbability: number; // 0-100
  powerRating: number; // 0-100
  momentum: number; // 0-100
  pressure: number; // 0-100
  accuracy?: number; // 0-100 (shotsOnTarget / totalShots)
  xG?: number;
  signal: "STRONG_OVER" | "STRONG_UNDER" | "NEUTRAL";
  isHotGame: boolean;
  spikeDetected: boolean;
  spikeDetails?: string;
  details?: string;
}

/**
 * Input types (partial, flexível)
 */
export interface FootballStatsInput {
  shotsOnTarget?: number;
  totalShots?: number;
  xG?: number;
  possession?: number;
  momentum?: number;
  attacks?: number;
  dangerousAttacks?: number;
  corners?: { home?: number; away?: number; total?: number };
  currentMinute?: number;
}

export interface BasketballStatsInput {
  pace?: number;
  fg?: number;
  fga?: number;
  turnovers?: number;
  offensiveRebounds?: number;
  homeScore?: number;
  awayScore?: number;
  currentPeriod?: string;
}

export interface VolleyballStatsInput {
  attackPoints?: number;
  blockPoints?: number;
  servePoints?: number;
  errors?: number;
}

/**
 * ScoutEngine class
 */
class ScoutEngineClass {
  constructor() {
    systemLogsService.add("🔍 ScoutEngine inicializado.");
  }

  // --- util: normalize to 0..1 (safe)
  private normalize(value: number | undefined, max: number): number {
    if (typeof value !== "number" || !isFinite(value) || max <= 0) return 0;
    return Math.min(1, Math.max(0, value / max));
  }

  // --- util: scale to 0..100
  private scale01To100(v: number) {
    return Number((Math.min(Math.max(v, 0), 1) * 100).toFixed(2));
  }

  // --- detect hot game and spikes (shared logic)
  private detectHotGameAndSpikesFootball(stats: FootballStatsInput) {
    const minute = stats.currentMinute ?? 0;
    const dangerous = stats.dangerousAttacks ?? 0;
    const attacks = stats.attacks ?? 0;
    const attacksPerMin = minute > 0 ? attacks / minute : 0;
    const dangerousPerMin = minute > 0 ? dangerous / minute : 0;

    const hot =
      attacksPerMin > 0.8 || (stats.xG ?? 0) > 2.0 || (dangerousPerMin > 0.3);
    const spikeDetected = attacksPerMin > 1.5 || dangerousPerMin > 0.6;

    const details = spikeDetected
      ? `High pressure: ${attacksPerMin.toFixed(2)} att/min, dangerous ${dangerousPerMin.toFixed(2)}`
      : "";

    return { isHotGame: !!hot, spikeDetected: !!spikeDetected, spikeDetails: details };
  }

  // --- Analisa estatísticas de futebol (time)
  analyzeFootballStats(matchId: string | undefined, teamId: number | string | undefined, stats: FootballStatsInput): ScoutResult {
    systemLogsService.add("📊 ScoutEngine: Analisando estatísticas de futebol...", { matchId, teamId });

    const shotsOnTarget = stats.shotsOnTarget ?? 0;
    const totalShots = stats.totalShots ?? 0;
    const xG = stats.xG ?? 0;
    const possession = stats.possession ?? 0;
    const momentum = stats.momentum ?? 50;
    const attacks = stats.attacks ?? 0;
    const dangerousAttacks = stats.dangerousAttacks ?? 0;

    // pressure composition (0..1)
    const pressure01 =
      this.normalize(shotsOnTarget, 10) * 0.30 +
      this.normalize(attacks, 150) * 0.20 +
      this.normalize(dangerousAttacks, 50) * 0.25 +
      this.normalize(possession, 100) * 0.15 +
      this.normalize(momentum, 100) * 0.10;

    // accuracy
    const accuracy = totalShots > 0 ? (shotsOnTarget / totalShots) : 0;

    // power index 0..1 then scale
    const power01 =
      pressure01 * 0.4 +
      Math.min(1, accuracy) * 0.25 +
      this.normalize(momentum, 100) * 0.2 +
      this.normalize(xG, 3) * 0.15;

    const pressure = this.scale01To100(pressure01);
    const powerRating = this.scale01To100(power01);
    const momentumScore = Number(Math.min(Math.max(momentum, 0), 100).toFixed(2));
    const accuracyPct = Number((accuracy * 100).toFixed(2));

    // probability base (prior)
    const priorProb = 50 + (powerRating * 0.25); // produces 50..75 range typically
    const calculatedProbability = Number(Math.min(99, Math.round(priorProb)).toFixed(2));

    const spikeInfo = this.detectHotGameAndSpikesFootball(stats);

    const signal = powerRating > 65 ? "STRONG_OVER" : (powerRating < 40 ? "STRONG_UNDER" : "NEUTRAL");

    // metric
    metricsService.addMetric("scout_football_analysis", 1);

    const result: ScoutResult = {
      matchId: matchId,
      teamId,
      calculatedProbability,
      powerRating,
      momentum: momentumScore,
      pressure,
      accuracy: accuracyPct,
      xG,
      signal,
      isHotGame: spikeInfo.isHotGame,
      spikeDetected: spikeInfo.spikeDetected,
      spikeDetails: spikeInfo.spikeDetails,
      details: `pressure:${pressure.toFixed(2)}, accuracy:${accuracyPct.toFixed(2)}, xG:${xG}`
    };

    systemLogsService.add("📈 ScoutEngine Football result", { matchId, teamId, result });
    return result;
  }

  // --- Analisa estatísticas de basquete
  analyzeBasketballStats(matchId: string | undefined, teamId: number | string | undefined, stats: BasketballStatsInput): ScoutResult {
    systemLogsService.add("🏀 ScoutEngine: Analisando estatísticas de basquete...", { matchId, teamId });

    const pace = stats.pace ?? 100;
    const fg = stats.fg ?? 0;
    const fga = stats.fga ?? 0;
    const turnovers = stats.turnovers ?? 0;
    const offensiveRebounds = stats.offensiveRebounds ?? 0;
    const homeScore = stats.homeScore ?? 0;
    const awayScore = stats.awayScore ?? 0;

    const efficiency = fga > 0 ? (fg / fga) : 0;

    // power composition
    const power01 =
      this.normalize(pace, 120) * 0.45 + // pace is very important
      this.normalize(efficiency, 1) * 0.25 +
      (1 - this.normalize(turnovers, 25)) * 0.15 +
      this.normalize(offensiveRebounds, 20) * 0.15;

    const powerRating = this.scale01To100(power01);
    const momentum = Math.min(100, Math.abs((homeScore + awayScore) / Math.max(1, 100)) * 100); // proxy
    const confidenceProb = 50 + (powerRating * 0.3);

    metricsService.addMetric("scout_basketball_analysis", 1);

    const result: ScoutResult = {
      matchId,
      teamId,
      calculatedProbability: Number(Math.min(99, Math.round(confidenceProb)).toFixed(2)),
      powerRating,
      momentum: Number(momentum.toFixed(2)),
      pressure: this.scale01To100(this.normalize(pace, 120) * 0.5), // conceptual pressure
      accuracy: Number((efficiency * 100).toFixed(2)),
      xG: 0,
      signal: powerRating > 65 ? "STRONG_OVER" : (powerRating < 40 ? "STRONG_UNDER" : "NEUTRAL"),
      isHotGame: power01 > 0.9,
      spikeDetected: pace > 110,
      spikeDetails: pace > 110 ? `High pace detected (${pace})` : undefined,
      details: `pace:${pace}, efficiency:${(efficiency*100).toFixed(2)}`
    };

    systemLogsService.add("📈 ScoutEngine Basketball result", { matchId, teamId, result });
    return result;
  }

  // --- Analisa estatísticas de vôlei
  analyzeVolleyballStats(matchId: string | undefined, teamId: number | string | undefined, stats: VolleyballStatsInput): ScoutResult {
    systemLogsService.add("🏐 ScoutEngine: Analisando estatísticas de vôlei...", { matchId, teamId });

    const attackPoints = stats.attackPoints ?? 0;
    const blockPoints = stats.blockPoints ?? 0;
    const servePoints = stats.servePoints ?? 0;
    const errors = stats.errors ?? 0;

    const attackPower = this.normalize(attackPoints, 40);
    const blockPower = this.normalize(blockPoints, 20);
    const servePower = this.normalize(servePoints, 15);
    const discipline = 1 - this.normalize(errors, 20);

    const power01 = attackPower * 0.45 + blockPower * 0.25 + servePower * 0.2 + discipline * 0.1;
    const powerRating = this.scale01To100(power01);

    metricsService.addMetric("scout_volleyball_analysis", 1);

    const result: ScoutResult = {
      matchId,
      teamId,
      calculatedProbability: Number(Math.min(99, Math.round(50 + powerRating * 0.2)).toFixed(2)),
      powerRating,
      momentum: Number((power01 * 100).toFixed(2)),
      pressure: this.scale01To100(attackPower),
      accuracy: undefined,
      xG: 0,
      signal: powerRating > 60 ? "STRONG_OVER" : "NEUTRAL",
      isHotGame: attackPoints > 24,
      spikeDetected: errors > 10,
      spikeDetails: errors > 10 ? `High error rate (${errors})` : undefined,
      details: `attack:${attackPoints}, block:${blockPoints}, serve:${servePoints}`
    };

    systemLogsService.add("📈 ScoutEngine Volleyball result", { matchId, teamId, result });
    return result;
  }
}

const scoutEngine = new ScoutEngineClass();
export default scoutEngine;
