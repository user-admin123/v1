// src/lib/logger.ts

// SIMPLE TOGGLE: Set to true to see logs on your mobile/Vercel
// Set to false before sending to a real customer
const SHOW_DEBUG = true; 

export const logger = {
  info: (...args: any[]) => {
    if (SHOW_DEBUG) console.log("[📗 INFO]", ...args);
  },
  warn: (...args: any[]) => {
    if (SHOW_DEBUG) console.warn("[📙 WARN]", ...args);
  },
  error: (...args: any[]) => {
    if (SHOW_DEBUG) console.error("[📕 ERROR]", ...args);
  },
  db: (operation: string, table: string, details?: any) => {
    if (SHOW_DEBUG) console.log(`[🗄️ DB] ${operation} → ${table}`, details ?? "");
  },
  auth: (action: string, details?: any) => {
    if (SHOW_DEBUG) console.log(`[🔑 AUTH] ${action}`, details ?? "");
  },
};
