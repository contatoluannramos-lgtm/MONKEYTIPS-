
import { FusionAnalysis, Match } from "../types";

export const webhookService = {
  async triggerAlert(match: Match, analysis: FusionAnalysis, webhookUrl: string) {
    if (!webhookUrl) return;

    const payload = {
      event: "MONKEY_TIPS_ALERT",
      timestamp: new Date().toISOString(),
      match: {
        title: `${match.teamA} x ${match.teamB}`,
        sport: match.sport,
        league: match.league,
        time: match.status === 'Live' ? 
            (match.sport === 'Futebol' ? `${(match.stats as any).currentMinute}'` : 'AO VIVO') : 
            match.startTime
      },
      analysis: {
        verdict: analysis.verdict,
        confidence: analysis.finalConfidence,
        ev: analysis.ev,
        scout_prob: analysis.scoutResult.calculatedProbability,
        is_hot: analysis.scoutResult.isHotGame,
        recommendation: analysis.verdict === 'GREEN_LIGHT' ? "ENTRADA RECOMENDADA" : "MONITORAR"
      }
    };

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });
      
      console.log(`Webhook Triggered: ${response.status}`);
      return response.ok;
    } catch (error) {
      console.error("Webhook Error:", error);
      return false;
    }
  }
};
