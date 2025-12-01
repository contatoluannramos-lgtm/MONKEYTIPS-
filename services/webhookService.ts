
// ======================================================================
// 🐒 Monkey Tips — Webhook Service (v3.0)
// Sistema de alertas e integração via proxy seguro
// ======================================================================

import { FusionAnalysis, Match } from "../types";

const PROXY_ENDPOINT = "/api/webhook-proxy";

// =====================================================
// Corpo do serviço
// =====================================================
export const webhookService = {
  // ---------------------------------------------------
  // Envia alerta real (verdict, EV+, probabilidades etc.)
  // ---------------------------------------------------
  async triggerAlert(match: Match, analysis: FusionAnalysis, webhookUrl: string) {
    if (!webhookUrl) return false;

    const payload = {
      username: "Monkey Tips Intelligence",
      avatar_url: "https://cdn-icons-png.flaticon.com/512/4712/4712009.png",
      content: `🚨 **MONKEY TIPS ALERT** | ${match.teamA} x ${match.teamB}`,
      embeds: [
        {
          title: "🔥 Oportunidade Detectada",
          color: analysis.verdict === "GREEN_LIGHT" ? 5763719 : 16776960, // green → yellow
          fields: [
            { name: "Partida", value: `${match.teamA} vs ${match.teamB}`, inline: true },
            { name: "Liga", value: match.league, inline: true },
            {
              name: "Confiança",
              value: `${analysis.finalConfidence}% (${analysis.confidenceLevel})`,
              inline: true,
            },
            { name: "EV+", value: `${analysis.ev}%`, inline: true },
            {
              name: "Scout Prob",
              value: `${analysis.scoutResult.calculatedProbability}%`,
              inline: true,
            },
            {
              name: "Status",
              value: analysis.scoutResult.isHotGame ? "🔥 HOT GAME" : "Normal",
              inline: true,
            },
          ],
          footer: { text: "Monkey Tips v2.0 • AI Sports Intelligence" },
          timestamp: new Date().toISOString(),
        },
      ],
    };

    return this.sendViaProxy(webhookUrl, payload);
  },

  // ---------------------------------------------------
  // Mensagem de teste (para validar coletores)
  // ---------------------------------------------------
  async sendTestMessage(webhookUrl: string) {
    if (!webhookUrl) return false;

    const payload = {
      username: "Monkey Collector",
      avatar_url: "https://cdn-icons-png.flaticon.com/512/4712/4712009.png",
      content: "",
      embeds: [
        {
          title: "📡 Collector Link Established",
          description: "A conexão com o Monkey Tips foi estabelecida com sucesso.",
          color: 5763719,
          fields: [
            { name: "Status", value: "✅ OPERATIONAL", inline: true },
            { name: "Pipeline", value: "Secure Proxy (Edge)", inline: true },
            { name: "Module", value: "Webhook Collector v2.0", inline: true },
          ],
          footer: { text: "Monkey Tips • System Notification" },
          timestamp: new Date().toISOString(),
        },
      ],
    };

    return this.sendViaProxy(webhookUrl, payload);
  },

  // ---------------------------------------------------
  // Envio via proxy seguro no backend
  // ---------------------------------------------------
  async sendViaProxy(url: string, payload: any) {
    if (!url || !payload) return false;

    try {
      const response = await fetch(PROXY_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, payload }),
      });

      if (!response.ok) {
        let err: any = null;
        try {
          err = await response.json();
        } catch {
          err = { error: "Unknown proxy error", status: response.status };
        }

        console.error("❌ Webhook Proxy Error:", err);
        return false;
      }

      return true;
    } catch (error) {
      console.error("❌ Webhook Service Failure:", error);
      return false;
    }
  },
};

