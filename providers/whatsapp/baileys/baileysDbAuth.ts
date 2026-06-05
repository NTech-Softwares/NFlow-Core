import {
  AuthenticationState,
  AuthenticationCreds,
  SignalDataTypeMap,
  initAuthCreds,
  BufferJSON,
} from "@whiskeysockets/baileys";
import { dbClient } from "../../../shared/database";
import { logger } from "../../../shared/utils/logger";

export async function clearPostgresAuthState(sessionId: string): Promise<void> {
  try {
    await dbClient.query(
      `DELETE FROM whatsapp_auth_creds WHERE session_id = $1`,
      [sessionId],
    );
    await dbClient.query(
      `DELETE FROM whatsapp_auth_keys WHERE session_id = $1`,
      [sessionId],
    );
    logger.warn(
      `[Auth DB] 🧹 Histórico de autenticação totalmente limpo para a sessão: ${sessionId}`,
    );
  } catch (err: any) {
    logger.error(
      `[Auth DB] Erro ao limpar estado de autenticação da sessão ${sessionId}: ${err.message}`,
    );
  }
}

export async function usePostgresAuthState(
  sessionId: string,
): Promise<{ state: AuthenticationState; saveCreds: () => Promise<void> }> {
  // 1. CARREGA AS CREDENCIAIS
  const credsRows = await dbClient.query(
    `SELECT creds FROM whatsapp_auth_creds WHERE session_id = $1`,
    [sessionId],
  );

  let creds: AuthenticationCreds;

  if (credsRows.length > 0) {
    creds = JSON.parse(credsRows[0].creds, BufferJSON.reviver);
  } else {
    creds = initAuthCreds();
    await dbClient.query(
      `
      INSERT INTO whatsapp_auth_creds (session_id, creds) VALUES ($1, $2)
      ON CONFLICT (session_id) DO UPDATE SET creds = EXCLUDED.creds
    `,
      [sessionId, JSON.stringify(creds, BufferJSON.replacer)],
    );
  }

  // 🚀 2. O SEGREDO: CARREGAMENTO EM MASSA PARA A RAM 🚀
  // Trazemos todas as chaves desta sessão para a memória de uma única vez na inicialização
  const memoryCache: { [type: string]: { [id: string]: any } } = {};

  try {
    const startTime = Date.now();
    const allKeys = await dbClient.query(
      `SELECT key_type, key_id, key_data FROM whatsapp_auth_keys WHERE session_id = $1`,
      [sessionId],
    );

    for (const row of allKeys) {
      if (!memoryCache[row.key_type]) memoryCache[row.key_type] = {};
      memoryCache[row.key_type][row.key_id] = JSON.parse(
        row.key_data,
        BufferJSON.reviver,
      );
    }
    logger.info(
      `[Auth DB] ⚡ RAM Cache carregado com ${allKeys.length} chaves em ${Date.now() - startTime}ms para a sessão: ${sessionId}`,
    );
  } catch (err) {
    logger.error(
      `[Auth DB] Erro crítico ao carregar cache de chaves para RAM:`,
      err,
    );
  }

  return {
    state: {
      creds,
      keys: {
        get: async (type, ids) => {
          const data: { [id: string]: any } = {};
          if (ids.length === 0) return data;

          // 🚀 LÊ DIRETAMENTE DA RAM (0ms de latência) EM VEZ DO POSTGRES
          for (const id of ids) {
            if (memoryCache[type] && memoryCache[type][id]) {
              data[id] = memoryCache[type][id];
            }
          }
          return data;
        },

        set: async (data) => {
          try {
            for (const category of Object.keys(data)) {
              if (!memoryCache[category]) memoryCache[category] = {};

              const entries = Object.entries(
                data[category as keyof SignalDataTypeMap] || {},
              );

              // 1. ATUALIZA A RAM IMEDIATAMENTE PARA DISPONIBILIZAR PARA O BAILEYS
              for (const [id, value] of entries) {
                if (value) {
                  memoryCache[category][id] = value;
                } else {
                  delete memoryCache[category][id];
                }
              }

              // 2. SALVA NO BANCO EM LOTE (BACKGROUND)
              const CHUNK_SIZE = 100;

              for (let i = 0; i < entries.length; i += CHUNK_SIZE) {
                const chunk = entries.slice(i, i + CHUNK_SIZE);

                const insertQueries: string[] = [];
                const insertValues: any[] = [];
                const deleteIds: string[] = [];
                let paramIndex = 1;

                for (const [id, value] of chunk) {
                  if (value) {
                    insertQueries.push(
                      `($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, CURRENT_TIMESTAMP)`,
                    );
                    insertValues.push(
                      sessionId,
                      category,
                      id,
                      JSON.stringify(value, BufferJSON.replacer),
                    );
                    paramIndex += 4;
                  } else {
                    deleteIds.push(id);
                  }
                }

                if (deleteIds.length > 0) {
                  await dbClient.query(
                    `DELETE FROM whatsapp_auth_keys WHERE session_id = $1 AND key_type = $2 AND key_id = ANY($3)`,
                    [sessionId, category, deleteIds],
                  );
                }

                if (insertQueries.length > 0) {
                  const query = `
                    INSERT INTO whatsapp_auth_keys (session_id, key_type, key_id, key_data, updated_at)
                    VALUES ${insertQueries.join(", ")}
                    ON CONFLICT (session_id, key_type, key_id) 
                    DO UPDATE SET key_data = EXCLUDED.key_data, updated_at = CURRENT_TIMESTAMP
                  `;
                  await dbClient.query(query, insertValues);
                }
              }
            }
          } catch (err) {
            logger.error(
              `[Auth DB] Erro crítico ao salvar lote de chaves:`,
              err,
            );
          }
        },
      },
    },
    saveCreds: async () => {
      await dbClient.query(
        `UPDATE whatsapp_auth_creds SET creds = $1, updated_at = CURRENT_TIMESTAMP WHERE session_id = $2`,
        [JSON.stringify(creds, BufferJSON.replacer), sessionId],
      );
    },
  };
}
