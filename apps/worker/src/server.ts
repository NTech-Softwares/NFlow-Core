import { messageQueue, QueueJob } from "../../../shared/queue/messageQueue";
import { getWhatsapp } from "../../../providers/whatsapp/baileys/client";
import { logger } from "../../../shared/utils/logger";
import { dbClient } from "../../../shared/database";
import { getSession, saveSession } from "../../../modules/chat/sessionStore";

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createMessagePayload(job: QueueJob) {
  return job.imagePath
    ? { image: { url: job.imagePath }, caption: job.messageText }
    : { text: job.messageText };
}

async function sendGroupMessage(sock: any, job: QueueJob, messagePayload: any) {
  await sock.sendPresenceUpdate("composing", job.jid);
  await delay(1000);
  const response = await sock.sendMessage(job.jid, messagePayload);
  logger.info(
    `[Sessão: ${job.sessionId}] Mensagem enviada para o grupo ${job.jid}`,
  );
}

async function sendLidMessage(sock: any, job: QueueJob, messagePayload: any) {
  await sock.sendPresenceUpdate("composing", job.jid);
  await delay(1000);
  const response = await sock.sendMessage(job.jid, messagePayload);

  if (response?.key?.id) {
    const session = await getSession(job.jid, job.sessionId);
    if (!session.botMessageIds) session.botMessageIds = [];
    session.botMessageIds.push(response.key.id);
    await saveSession(job.jid, job.sessionId, session);
  }
}

async function sendPrivateMessage(
  sock: any,
  job: QueueJob,
  messagePayload: any,
) {
  const number = job.jid.replace("@s.whatsapp.net", "");
  const [result] = await sock.onWhatsApp(number);

  if (!result?.exists) {
    throw new Error("NÚMERO_INEXISTENTE: Este número não existe no WhatsApp.");
  }

  const realJid = result.jid;
  await sock.presenceSubscribe(realJid);
  await delay(500);

  const response = await sock.sendMessage(realJid, messagePayload);

  if (response?.key?.id) {
    const session = await getSession(realJid, job.sessionId);
    if (!session.botMessageIds) session.botMessageIds = [];
    session.botMessageIds.push(response.key.id);
    await saveSession(realJid, job.sessionId, session);
  }
}

async function processJob(job: QueueJob) {
  try {
    const sock = getWhatsapp(job.sessionId);

    // Validação estrita da saúde do WebSocket
    if (!sock || !sock.ws || sock.ws.readyState !== 1) {
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

    // Marca como sucesso na fila
    await messageQueue.complete(job.id);

    // Salva log assíncrono (SEM throw dentro do catch)
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
      error.code === "ECONNRESET";

    // Se for erro de conexão, incrementa tentativa. Se for erro de validação (ex: numero não existe), não adianta tentar de novo.
    const newAttempts = job.attempts + 1;

    if (isConnectionError && newAttempts < 3) {
      logger.warn(
        `[Worker] Falha de rede para ${job.jid}. Reagendando (Tentativa ${newAttempts}/3)...`,
      );
      await messageQueue.fail(job.id, newAttempts, errorMessage);
    } else {
      logger.error(
        `[Worker] Falha definitiva para ${job.jid}: ${errorMessage}`,
      );
      await messageQueue.fail(job.id, 999, errorMessage); // 999 garante status 'failed' absoluto

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
  logger.info("🚀 Worker DB-Queue Multi-Tenant iniciado!");

  while (true) {
    // 🟢 Busca até 10 mensagens simultâneas travando-as para este worker processar
    const batch = await messageQueue.fetchBatch(10);

    if (batch.length === 0) {
      await delay(2000); // Fila vazia, descansa 2s antes de buscar novamente
      continue;
    }

    logger.info(
      `[Worker] Processando lote de ${batch.length} mensagens concorrentes...`,
    );

    // 🟢 Executa o processamento de forma paralela usando Promise.allSettled
    // Isso impede que a mensagem de um cliente atrase o fluxo de outro cliente!
    await Promise.allSettled(
      batch.map(async (job) => {
        // Pequeno delay randômico de anti-ban aplicado individualmente por thread
        await delay(Math.floor(Math.random() * 1000) + 400);
        await processJob(job);
      }),
    );
  }
}
