const isDev = import.meta.env.DEV;

export const logger = {
  info: (...args: any[]) => {
    if (isDev) console.log("[📗 INFO]", ...args);
  },
  warn: (...args: any[]) => {
    if (isDev) console.warn("[📙 WARN]", ...args);
  },
  error: (...args: any[]) => {
    if (isDev) console.error("[📕 ERROR]", ...args);
  },
  db: (operation: string, table: string, details?: any) => {
    if (isDev) console.log(`[🗄️ DB] ${operation} → ${table}`, details ?? "");
  },
  auth: (action: string, details?: any) => {
    if (isDev) console.log(`[🔑 AUTH] ${action}`, details ?? "");
  },
};
