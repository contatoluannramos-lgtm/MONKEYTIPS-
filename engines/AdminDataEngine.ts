
// engines/AdminDataEngine.ts
import eventsService from "../services/eventsService";
import metricsService from "../services/metricsService";
import systemLogsService from "../services/systemLogsService";

class AdminDataEngine {
    queue: any[];

    constructor() {
        this.queue = [];
    }

    /** Adiciona um item à fila */
    enqueue(data: any) {
        const item = {
            id: crypto.randomUUID(),
            entityName: data.entityName || "",
            rawData: data.rawData || "",
            processedAt: new Date().toISOString(),
            isPositive: data.isPositive ?? false,
            impactValue: data.impactValue ?? 0,
            processed: false
        };

        this.queue.push(item);
        systemLogsService.add(`📥 Novo item adicionado à fila do AdminDataEngine (${item.entityName})`);
        return item;
    }

    /** Processamento Fake (placeholder para Gemini) */
    async processWithAI(rawData: string) {
        systemLogsService.add(`🧠 Processando dado via Gemini...`);

        // 🔥 Aqui entra o GEMINI real mais tarde
        return {
            isPositive: rawData.length % 2 === 0,
            impactValue: Math.floor(Math.random() * 100),
        };
    }

    /** Processa um item específico */
    async processItem(id: string) {
        const item = this.queue.find(q => q.id === id);
        if (!item) return null;

        const ai = await this.processWithAI(item.rawData);

        item.isPositive = ai.isPositive;
        item.impactValue = ai.impactValue;
        item.processed = true;

        systemLogsService.add(`✅ Item processado por IA: ${item.entityName}`);

        await eventsService.createEvent({
            engine: "AdminDataEngine",
            type: "manual-process",
            payload: item
        });

        await metricsService.addMetric("admin_processed", 1);

        return item;
    }

    /** Processa tudo da fila */
    async processAll() {
        for (const item of this.queue) {
            if (!item.processed) {
                await this.processItem(item.id);
            }
        }

        systemLogsService.add("📦 AdminDataEngine: Fila processada.");
        return this.queue;
    }

    /** Reset do Engine */
    clear() {
        this.queue = [];
        systemLogsService.add("🧹 AdminDataEngine resetado.");
    }
}

const adminDataEngine = new AdminDataEngine();
export default adminDataEngine;
