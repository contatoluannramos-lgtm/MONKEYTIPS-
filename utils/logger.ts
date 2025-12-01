
// utils/logger.ts
import { LogEntry } from "../types";

type LogLevel = 'INFO' | 'WARN' | 'ERROR';
type LogTag = 'API' | 'DB' | 'AUTH' | 'NBA' | 'F-BALL' | 'LIVE' | 'ADMIN' | 'GEMINI' | 'SCOUT' | 'FUSION' | 'SYSTEM' | 'MONKEY_STATS' | 'MONKEY_NEWS';

type LogListener = (entry: LogEntry) => void;

class LoggerService {
  private listeners: LogListener[] = [];
  private logBuffer: LogEntry[] = [];
  private readonly MAX_BUFFER_SIZE = 500;

  constructor() {
    // Carregar logs iniciais se necessário
  }

  // Permite que componentes React se inscrevam para receber novos logs
  subscribe(listener: LogListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  // Retorna o histórico atual (útil ao montar o componente)
  getHistory(): LogEntry[] {
    return [...this.logBuffer];
  }

  private notify(entry: LogEntry) {
    this.listeners.forEach(listener => listener(entry));
  }

  private addEntry(level: LogLevel, tag: LogTag, message: string, data?: any) {
    const entry: LogEntry = {
      id: Math.random().toString(36).substring(7),
      timestamp: new Date().toISOString(),
      level,
      tag,
      message,
      data: data ? JSON.parse(JSON.stringify(data)) : undefined // Deep copy seguro
    };

    // Atualiza buffer interno
    this.logBuffer.unshift(entry);
    if (this.logBuffer.length > this.MAX_BUFFER_SIZE) {
      this.logBuffer.pop();
    }

    // Console do navegador (para debug padrão)
    const time = new Date(entry.timestamp).toLocaleTimeString();
    
    if (level === 'ERROR') {
      console.error(`%c[${tag}] ${message}`, 'color: #ef4444; font-weight: bold;', data || '');
    } else if (level === 'WARN') {
      console.warn(`%c[${tag}] ${message}`, 'color: #f59e0b; font-weight: bold;', data || '');
    } else {
      console.log(`%c[${tag}] %c${message}`, 'color: #3b82f6; font-weight: bold;', 'color: #a1a1aa;', data || '');
    }

    // Notifica UI
    this.notify(entry);
  }

  info(tag: LogTag, message: string, data?: any) {
    this.addEntry('INFO', tag, message, data);
  }

  warn(tag: LogTag, message: string, data?: any) {
    this.addEntry('WARN', tag, message, data);
  }

  error(tag: LogTag, message: string, error?: any) {
    const errorMessage = error instanceof Error ? error.message : (error ? String(error) : '');
    this.addEntry('ERROR', tag, `${message}${errorMessage ? `: ${errorMessage}` : ''}`, error);
  }
  
  clear() {
    this.logBuffer = [];
    // Opcional: Notificar listeners de limpeza se necessário
  }
}

export const logger = new LoggerService();
