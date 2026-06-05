import { messageQueue, QueueJob } from "../../../shared/queue/messageQueue";
import { getWhatsapp } from "../../../providers/whatsapp/baileys/client";
import { logger } from "../../../shared/utils/logger";
import { dbClient } from "../../../shared/database";

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// 🛡️ ESSENCIAL: Impede que o Baileys congele o worker para sempre
function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  errorMessage: string,
): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(errorMessage)), ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() =>
    clearTimeout(timer),
  );
}

function createMessagePayload(job: QueueJob) {
  return job.imagePath
    ? { image: { url: job.imagePath }, caption: job.messageText }
    : { text: job.messageText };
}

async function sendGroupMessage(sock: any, job: QueueJob, messagePayload: any) {
  await delay(100);

  const response = await withTimeout(
    sock.sendMessage(job.jid, messagePayload),
    30000, // Aumentado para 30s
    "TIMEOUT_BAILEYS_GRUPO",
  );

  // Verificação de segurança: O Baileys apenas retorna um objeto se o servidor confirmar a recepção
  if (!response || !response.key || !response.key.id) {
    throw new Error("MENSAGEM_NAO_CONFIRMADA_PELO_SERVIDOR");
  }

  if (response?.key?.id) {
    await dbClient.query(
      `UPDATE chat_sessions 
       SET bot_message_ids = COALESCE(bot_message_ids, '[]'::jsonb) || $1::jsonb, updated_at = CURRENT_TIMESTAMP
       WHERE session_id = $2 AND remote_jid = $3`,
      [JSON.stringify([response.key.id]), job.sessionId, job.jid],
    );
  }
  logger.info(
    `[Sessão: ${job.sessionId}] Mensagem enviada para o grupo ${job.jid}`,
  );
}

async function sendLidMessage(sock: any, job: QueueJob, messagePayload: any) {
  await sock.sendPresenceUpdate("composing", job.jid);
  await delay(500);

  const response = await withTimeout(
    sock.sendMessage(job.jid, messagePayload),
    15000,
    "TIMEOUT_BAILEYS: Falha ao enviar mensagem LID.",
  );

  if (response?.key?.id) {
    await dbClient.query(
      `UPDATE chat_sessions 
       SET bot_message_ids = COALESCE(bot_message_ids, '[]'::jsonb) || $1::jsonb, updated_at = CURRENT_TIMESTAMP
       WHERE session_id = $2 AND remote_jid = $3`,
      [JSON.stringify([response.key.id]), job.sessionId, job.jid],
    );
  }
}

async function sendPrivateMessage(
  sock: any,
  job: QueueJob,
  messagePayload: any,
) {
  const number = job.jid.replace("@s.whatsapp.net", "");

  const [result] = await withTimeout(
    sock.onWhatsApp(number),
    10000,
    "TIMEOUT_BAILEYS: Falha ao verificar existência do número.",
  );

  if (!result?.exists) {
    throw new Error("NÚMERO_INEXISTENTE: Este número não existe no WhatsApp.");
  }

  const realJid = result.jid;
  await sock.presenceSubscribe(realJid);
  await delay(500);

  const response = await withTimeout(
    sock.sendMessage(realJid, messagePayload),
    15000,
    "TIMEOUT_BAILEYS: Falha ao enviar mensagem privada.",
  );

  if (response?.key?.id) {
    await dbClient.query(
      `UPDATE chat_sessions 
       SET bot_message_ids = COALESCE(bot_message_ids, '[]'::jsonb) || $1::jsonb, updated_at = CURRENT_TIMESTAMP
       WHERE session_id = $2 AND remote_jid = $3`,
      [JSON.stringify([response.key.id]), job.sessionId, realJid],
    );
  }
}

async function processJob(job: QueueJob) {
  try {
    const sock = getWhatsapp(job.sessionId);

    if (!sock || !sock.ws || !sock.ws.isOpen) {
      throw new Error(
        "SESSAO_OFFLINE: Socket não inicializado ou sem conexão.",
      );
    }

    const messagePayload = createMessagePayload(job);
    const isGroup = job.jid.endsWith("@g.us");
    const isLid = job.jid.endsWith("@lid");

    if (isGroup) {
      await sendGroupMessage(sock, job, messagePayload);
    } else if (isLid) {
      await sendLidMessage(sock, job, messagePayload);
    } else {
      await sendPrivateMessage(sock, job, messagePayload);
    }

    await messageQueue.complete(job.id);

    dbClient
      .query(
        `INSERT INTO whatsapp_message_logs (session_id, jid, message_text, status) VALUES ($1, $2, $3, 'sent')`,
        [job.sessionId, job.jid, job.messageText],
      )
      .catch((err) =>
        logger.error(
          `[Worker Log Erro] Falha ao salvar log de auditoria: ${err.message}`,
        ),
      );
  } catch (error: any) {
    const errorMessage = error.message || "Erro desconhecido no processamento.";
    const isConnectionError =
      errorMessage.includes("SESSAO_OFFLINE") ||
      errorMessage.includes("Closed") ||
      errorMessage.includes("stream") ||
      errorMessage.includes("TIMEOUT_BAILEYS") ||
      error.code === "ECONNRESET";

    const newAttempts = job.attempts + 1;

    if (isConnectionError && newAttempts < 3) {
      logger.warn(
        `[Worker] Falha temporal para ${job.jid}. Reagendando (Tentativa ${newAttempts}/3)... - Motivo: ${errorMessage}`,
      );
      await messageQueue.fail(job.id, newAttempts, errorMessage);
    } else {
      logger.error(
        `[Worker] Falha definitiva para ${job.jid}: ${errorMessage}`,
      );
      await messageQueue.fail(job.id, 999, errorMessage);

      dbClient
        .query(
          `INSERT INTO whatsapp_message_logs (session_id, jid, message_text, status, error_message) VALUES ($1, $2, $3, 'failed', $4)`,
          [job.sessionId, job.jid, job.messageText, errorMessage],
        )
        .catch((err) =>
          logger.error(
            `[Worker Log Erro] Falha ao salvar log de erro: ${err.message}`,
          ),
        );
    }
  }
}

export async function startWorker() {
  logger.info("🚀 [Worker De Envio] iniciado!");

  await delay(7000);

  while (true) {
    try {
      // 1. Busca o lote (Batch)
      const batch = await messageQueue.fetchBatch(10);

      if (batch.length === 0) {
        await delay(2000);
        continue;
      }

      logger.info(
        `[Worker] Iniciando processamento de lote com ${batch.length} jobs.`,
      );

      const completedIds: string[] = [];

      // 2. Processamento SEQUENCIAL (mesmo sendo um lote, enviamos um por um)
      for (const job of batch) {
        try {
          const isGroup = job.jid.endsWith("@g.us");
          const randomDelay = isGroup
            ? 1000 + Math.floor(Math.random() * 1000)
            : 500 + Math.floor(Math.random() * 1000);

          await delay(randomDelay);

          // processJob continua existindo, mas REMOVA o messageQueue.complete(job.id) de dentro dele
          // para não fazer query a cada mensagem individualmente.
          await processJob(job);

          completedIds.push(job.id);
        } catch (error) {
          logger.error(`[Worker] Erro no job ${job.id}: ${error}`);
          // Se falhar, o método fail() do seu queue manager já cuida do status individual
        }
      }

      // 3. Persistência em lote (Salva o sucesso de todos de uma vez)
      await messageQueue.completeBatch(completedIds);
      logger.info(
        `[Worker] Lote finalizado. ${completedIds.length} mensagens marcadas como enviadas.`,
      );
    } catch (loopError: any) {
      logger.error(`[Worker Loop Error]: ${loopError.message}`);
      await delay(2000);
    }
  }
}
