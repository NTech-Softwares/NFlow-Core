import { Pool, QueryResultRow } from "pg";
import { logger } from "../utils/logger";

const pool = new Pool({
  user: process.env.DB_USER || "ntech_admin",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "nflow_db",
  password: process.env.DB_PASSWORD || "sua_senha_aqui",
  port: Number(process.env.DB_PORT) || 5432,
  max: 20,
  idleTimeoutMillis: 30000,
});

pool.on("error", (err) => {
  logger.error("[Database Pool] Erro inesperado em cliente ocioso:", err);
});

/**
 * Função auxiliar para identificar o tipo de operação SQL (SELECT, INSERT, etc.)
 */
function getQueryOperation(sqlText: string): string {
  // Remove espaços em branco e quebras de linha do início e pega a primeira palavra
  const match = sqlText.trim().match(/^([A-Z]+)/i);
  return match ? match[1].toUpperCase() : "UNKNOWN";
}

export const dbClient = {
  /**
   * Executa uma query SQL de forma segura utilizando Prepared Statements.
   */
  async query<T extends QueryResultRow = any>(
    text: string,
    params?: any[],
  ): Promise<T[]> {
    const start = Date.now();
    const operation = getQueryOperation(text); // 🚀 Identifica se é SELECT, INSERT, UPDATE, etc.

    try {
      const res = await pool.query<T>(text, params);
      const duration = Date.now() - start;

      // Logger dinâmico para ambiente de desenvolvimento
      if (process.env.NODE_ENV !== "production") {
        logger.info(
          `[Query: ${operation}] Duração: ${duration}ms | Linhas afetadas: ${res.rowCount ?? 0}`,
        );
      }

      return res.rows;
    } catch (error: any) {
      // No log de erro, incluímos o tipo da operação para facilitar a triagem imediata
      logger.error(
        `[Database Error: ${operation}] Falha ao executar query. Detalhes: ${error.message} | SQL: ${text.trim().replace(/\s+/g, " ")}`,
      );
      throw error;
    }
  },
};

export default dbClient;
