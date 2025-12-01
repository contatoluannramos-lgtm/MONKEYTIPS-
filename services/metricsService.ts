
// services/metricsService.ts
// Coleta e entrega todas as métricas internas do Monkey Tips

import { api } from "../utils/apiClient";

export interface MonkeyMetric {
  id?: string;
  module: string;       // ex: "SCOUT", "FUSION", "PREJOGO", "LIVE", "ADMIN"
  key: string;          // ex: "precision", "winrate", "green_rate", "tempo_resposta"
  value: number;        // valor numérico
  metadata?: any;       // detalhes opcionais
  created_at?: string;
}

export const metricsService = {
  async sendMetric(metric: MonkeyMetric) {
    return api.post("/metrics/send", metric);
  },

  async list(limit = 200) {
    return api.get(`/metrics/list?limit=${limit}`);
  },

  async getByModule(module: string) {
    return api.get(`/metrics/module/${module}`);
  },

  async getDashboard() {
    return api.get("/metrics/dashboard"); 
  },

  async delete(id: string) {
    return api.delete(`/metrics/delete/${id}`);
  }
};
