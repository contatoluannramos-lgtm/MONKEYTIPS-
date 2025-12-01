
// services/eventsService.ts
// Central de eventos do Monkey Tips
// Envia, lista e filtra eventos dos Engines (Scout, Fusion, Live Engine futuramente)

import { api } from "../utils/apiClient";

export interface MonkeyEvent {
  id?: string;
  type: string;                 // ex: "SCOUT_UPDATE", "FUSION_ALERT", "ADMIN_ACTION"
  message: string;              // descrição do evento
  severity: "low" | "medium" | "high"; 
  metadata?: any;               // dados extras (opcional)
  created_at?: string;
}

export const eventsService = {
  async create(event: MonkeyEvent) {
    return api.post("/events/create", event);
  },

  async list(limit = 100) {
    return api.get(`/events/list?limit=${limit}`);
  },

  async filterByType(type: string) {
    return api.get(`/events/filter?type=${type}`);
  },

  async delete(id: string) {
    return api.delete(`/events/delete/${id}`);
  }
};
