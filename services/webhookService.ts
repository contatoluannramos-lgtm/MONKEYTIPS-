
import { FusionAnalysis, Match } from "../types";

const PROXY_ENDPOINT = '/api/webhook-proxy';

export const webhookService = {
  async triggerAlert(match: Match, analysis: FusionAnalysis, webhookUrl: string) {
    if (!webhookUrl) return false;

    const payload = {
      username: "Monkey Tips Intelligence",
      avatar_url: "https://cdn-icons-png.flaticon.com/512/4712/4712009.png",
      content: `🚨 **MONKEY TIPS ALERT** | ${match.teamA} x ${match.teamB}`,
      embeds: [{
        title: "🔥 Oportunidade Detectada",
        color: analysis.verdict === 'GREEN_LIGHT' ? 5763719 : 16776960, // Green or Yellow
        fields: [
          { name: "Partida", value: `${match.teamA} vs ${match.teamB}`, inline: true },
          { name: "Liga", value: match.league, inline: true },
          { name: "Confiança", value: `${analysis.finalConfidence}% (${analysis.confidenceLevel})`, inline: true },
          { name: "EV+", value: `${analysis.ev}%`, inline: true },
          { name: "Scout Prob", value: `${analysis.scoutResult.calculatedProbability}%`, inline: true },
          { name: "Status", value: analysis.scoutResult.isHotGame ? "🔥 HOT GAME" : "Normal", inline: true }
        ],
        footer: { text: "Monkey Tips v2.0 • AI Sports Intelligence" },
        timestamp: new Date().toISOString()
      }]
    };

    return this.sendViaProxy(webhookUrl, payload);
  },

  async sendTestMessage(webhookUrl: string) {
      if (!webhookUrl) return false;

      const payload = {
          username: "Monkey Collector",
          avatar_url: "https://cdn-icons-png.flaticon.com/512/4712/4712009.png",
          content: "",
          embeds: [{
              title: "📡 Collector Link Established",
              description: "A conexão com o Monkey Tips foi estabelecida com sucesso.",
              color: 5763719, // Brand Green
              fields: [
                  { name: "Status", value: "✅ OPERATIONAL", inline: true },
                  { name: "Pipeline", value: "Secure Proxy (Edge)", inline: true },
                  { name: "Module", value: "Webhook Collector v2.0", inline: true }
              ],
              footer: { text: "Monkey Tips • System Notification" },
              timestamp: new Date().toISOString()
          }]
      };

      return this.sendViaProxy(webhookUrl, payload);
  },

  async sendViaProxy(url: string, payload: any) {
      try {
          const response = await fetch(PROXY_ENDPOINT, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ url, payload })
          });
          
          if (!response.ok) {
              const err = await response.json();
              console.error("Proxy Error:", err);
              return false;
          }
          
          return true;
      } catch (error) {
          console.error("Webhook Service Error:", error);
          return false;
      }
  }
};
