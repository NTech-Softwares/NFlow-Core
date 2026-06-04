import {
  AuthenticationState,
  AuthenticationCreds,
  SignalDataTypeMap,
  initAuthCreds,
  BufferJSON,
} from "@whiskeysockets/baileys";
import { dbClient } from "../../../shared/database";
import { logger } from "../../../shared/utils/logger";

export async function usePostgresAuthState(
  sessionId: string,
): Promise<{ state: AuthenticationState; saveCreds: () => Promise<void> }> {
  // 1. Carrega ou Inicializa as Credenciais (Creds)
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

  return {
    state: {
      creds,
      keys: {
        get: async (type, ids) => {
          const data: { [id: string]: any } = {};
          if (ids.length === 0) return data;

          try {
            // 🌟 CORREÇÃO: Filtrando estritamente pelo tipo da chave (key_type)
            const rows = await dbClient.query(
              `
                SELECT key_id, key_data FROM whatsapp_auth_keys 
                WHERE session_id = $1 AND key_type = $2 AND key_id = ANY($3::text[])
              `,
              [sessionId, type, ids],
            );

            for (const row of rows) {
              const value = JSON.parse(row.key_data, BufferJSON.reviver);
              data[row.key_id] = value;
            }
          } catch (err) {
            logger.error(
              `[Auth DB] Erro ao ler chaves do tipo ${type} para os IDs:`,
              ids,
              err,
            );
          }

          return data;
        },

        set: async (data) => {
          try {
            // Processamos por categoria para garantir o isolamento do key_type
            for (const category of Object.keys(data)) {
              const insertQueries: string[] = [];
              const insertValues: any[] = [];
              const deleteIds: string[] = [];
              let paramIndex = 1;

              for (const id of Object.keys(
                data[category as keyof SignalDataTypeMap],
              )) {
                const value = data[category as keyof SignalDataTypeMap][id];

                if (value) {
                  // 🌟 CORREÇÃO: Guardando session_id, key_type e key_id de forma isolada
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

              // 1. Executa exclusões escopadas por categoria
              if (deleteIds.length > 0) {
                await dbClient.query(
                  `DELETE FROM whatsapp_auth_keys WHERE session_id = $1 AND key_type = $2 AND key_id = ANY($3)`,
                  [sessionId, category, deleteIds],
                );
              }

              // 2. Executa inserções/atualizações escopadas por categoria com nova constraint
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
          } catch (err) {
            logger.error(
              `[Auth DB] Erro ao salvar chaves no banco de dados:`,
              err,
            );
          }
        },
      },
    },
    saveCreds: async () => {
      await dbClient.query(
        `
        UPDATE whatsapp_auth_creds 
        SET creds = $1, updated_at = CURRENT_TIMESTAMP 
        WHERE session_id = $2
      `,
        [JSON.stringify(creds, BufferJSON.replacer), sessionId],
      );
    },
  };
}
