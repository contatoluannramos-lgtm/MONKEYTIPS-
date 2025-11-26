
import { FusionAnalysis, Match } from "../types";

export const webhookService = {
  async triggerAlert(match: Match, analysis: FusionAnalysis, webhookUrl: string) {
    if (!webhookUrl) return;

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
  },

  async sendTestMessage(webhookUrl: string) {
      if (!webhookUrl) return false;

      const payload = {
          username: "Monkey Tips System",
          content: "🦍 **Monkey Tips v2.0**: Teste de Conexão do Webhook realizado com sucesso! \n✅ O sistema está pronto para enviar alertas em tempo real.",
      };

      try {
          const response = await fetch(webhookUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
          });
          return response.ok;
      } catch (error) {
          console.error("Webhook Test Error:", error);
          return false;
      }
  }
};
