
// utils/logger.ts

type LogLevel = 'INFO' | 'WARN' | 'ERROR';
type LogTag = 'API' | 'DB' | 'AUTH' | 'NBA' | 'F-BALL' | 'LIVE' | 'ADMIN' | 'GEMINI' | 'SCOUT' | 'FUSION' | 'SYSTEM';

const log = (level: LogLevel, tag: LogTag, message: string, data?: any) => {
  const timestamp = new Date().toLocaleTimeString();
  
  // Use console methods for different levels
  const logMethod = {
    INFO: console.log,
    WARN: console.warn,
    ERROR: console.error
  }[level];

  // Styling for tags in browser console
  const tagStyle = 'color: #a1a1aa; font-weight: bold;'; // zinc-400
  
  if (data) {
    logMethod(`${timestamp} %c[${tag}]`, tagStyle, message, data);
  } else {
    logMethod(`${timestamp} %c[${tag}]`, tagStyle, message);
  }
};

export const logger = {
  info: (tag: LogTag, message: string, data?: any) => log('INFO', tag, message, data),
  warn: (tag: LogTag, message: string, data?: any) => log('WARN', tag, message, data),
  error: (tag: LogTag, message: string, error?: any) => {
    const errorMessage = error instanceof Error ? error.message : (error ? String(error) : '');
    log('ERROR', tag, `${message}${errorMessage ? `: ${errorMessage}` : ''}`, error);
  },
};
