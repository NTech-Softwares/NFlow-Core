import { messageQueue } from "../../../shared/queue/messageQueue";
import { getWhatsapp } from "../../../providers/whatsapp/baileys/client";
import { logger } from "../../../shared/utils/logger";
import { QueueJob } from "../../../shared/types/QueueJob";
import { updateSchedule } from "../../../modules/scheduler/schedule.repository";
import { dbClient } from "../../../shared/database"; // 🟢 Importado para logs de auditoria
import {
  getSession,
  saveSession,
} from "../../../modules/flows/state/sessionStore";

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createMessagePayload(job: any) {
  return job.imagePath
    ? {
        image: { url: job.imagePath },
        caption: job.message.text,
      }
    : {
        text: job.message.text,
      };
}

async function sendGroupMessage(sock: any, job: any, messagePayload: any) {
  logger.info(
    `\n[Sessão: ${job.sessionId}] === ENVIO GRUPO ===\nJID: ${job.jid}`,
  );
  await sock.sendPresenceUpdate("composing", job.jid);
  await delay(1000);

  const response = await sock.sendMessage(job.jid, messagePayload);
  logger.info(
    `\n[Sessão: ${job.sessionId}] === MENSAGEM ENVIADA ===\nJID: ${job.jid}\nID: ${response.key.id}`,
  );
}

async function sendLidMessage(sock: any, job: any, messagePayload: any) {
  logger.info(
    `\n[Sessão: ${job.sessionId}] === ENVIO LID ===\nJID: ${job.jid}`,
  );
  await sock.sendPresenceUpdate("composing", job.jid);
  await delay(1000);

  const response = await sock.sendMessage(job.jid, messagePayload);

  if (response?.key?.id) {
    const session = await getSession(job.jid, job.sessionId);
    if (!session.botMessageIds) session.botMessageIds = [];
    session.botMessageIds.push(response.key.id);
    await saveSession(job.jid, job.sessionId, session);
  }

  logger.info(
    `\n[Sessão: ${job.sessionId}] === MENSAGEM ENVIADA ===\nJID: ${job.jid}\nID: ${response.key.id}`,
  );
}

async function sendPrivateMessage(sock: any, job: any, messagePayload: any) {
  logger.info(
    `\n[Sessão: ${job.sessionId}] === ENVIO PRIVADO ===\nJID: ${job.jid}`,
  );

  const number = job.jid.replace("@s.whatsapp.net", "");
  const [result] = await sock.onWhatsApp(number);

  if (!result?.exists) {
    logger.error(
      `\n[Sessão: ${job.sessionId}] === NÚMERO NÃO EXISTE NO WHATSAPP ===\nJID: ${job.jid}`,
    );
    return;
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

  logger.info(
    `\n[Sessão: ${job.sessionId}] === MENSAGEM ENVIADA ===\nJID: ${realJid}\nID: ${response.key.id}`,
  );
}

export async function startWorker() {
  logger.info("Worker iniciado operando em modo Multi-Tenant");

  while (true) {
    // 🟢 CORREÇÃO: Usando o método .size() em vez de .length
    if (messageQueue.size() > 0) {
      // 🟢 CORREÇÃO: Usando o método .shift() exposto pela classe manager
      const job = messageQueue.shift() as QueueJob | undefined;

      if (!job) {
        await delay(700);
        continue;
      }

      try {
        const sock = getWhatsapp(job.sessionId);

        if (!sock) {
          throw new Error(
            "SESSAO_OFFLINE: O socket do Baileys não está inicializado ou está indisponível.",
          );
        }

        logger.info(`
        ==================================================
        PROCESSANDO JOB MULTI-TENANT
        ==================================================
        SESSÃO DONA: ${job.sessionId}
        DESTINATÁRIO: ${job.jid}
        TEXTO: ${job.message.text.substring(0, 30)}...
        HAS_IMAGE: ${job.imagePath ? "SIM" : "NÃO"}
        ==================================================
        `);

        const messagePayload = createMessagePayload(job);
        const isGroup = job.jid.endsWith("@g.us");
        const isUser = job.jid.endsWith("@s.whatsapp.net");
        const isLid = job.jid.endsWith("@lid");

        if (isGroup) {
          await sendGroupMessage(sock, job, messagePayload);
        } else if (isUser) {
          await sendPrivateMessage(sock, job, messagePayload);
        } else if (isLid) {
          await sendLidMessage(sock, job, messagePayload);
        } else {
          logger.error(
            `[Sessão: ${job.sessionId}] JID Inválido (Descarte): ${job.jid}`,
          );
          if (job.userId && job.scheduleId) {
            await updateSchedule(job.userId, job.scheduleId, {
              status: "failed",
              error: "JID do destinatário inválido ou malformado.",
            });
          }
          continue;
        }

        // 🟢 AUDITORIA: Grava log de sucesso no banco relacional
        await dbClient
          .query(
            `
          INSERT INTO whatsapp_message_logs (session_id, jid, message_text, status)
          VALUES ($1, $2, $3, 'sent')
        `,
            [job.sessionId, job.jid, job.message.text],
          )
          .catch(() => {});

        const randomDelay = Math.floor(Math.random() * 2000) + 2000;
        await delay(randomDelay);
      } catch (error: any) {
        logger.error(`
        ==================================================
        ERRO DETECTADO NO PROCESSAMENTO DO JOB
        ==================================================
        SESSÃO: ${job.sessionId}
        ALVO: ${job.jid}
        MOTIVO: ${error.message || error}
        ==================================================
        `);

        const errorMessage = error.message || "";
        const isConnectionError =
          errorMessage.includes("Closed") ||
          errorMessage.includes("not opened") ||
          errorMessage.includes("connecting") ||
          errorMessage.includes("SESSAO_OFFLINE") ||
          errorMessage.includes("undefined") ||
          error.name === "TypeError" ||
          error.code === "ECONNRESET" ||
          error.code === "EPIPE";

        const currentAttempts = job.attempts || 0;

        if (isConnectionError && currentAttempts < 3) {
          job.attempts = currentAttempts + 1;
          logger.warn(
            `[Worker] Instância [${job.sessionId}] está instável. Tentando novamente (${job.attempts}/3)...`,
          );
          messageQueue.push(job);
          await delay(1000);
        } else {
          logger.error(
            `[Worker] Job da sessão [${job.sessionId}] descartado definitivamente.`,
          );

          // 🟢 AUDITORIA: Grava log de erro definitivo no banco relacional
          await dbClient
            .query(
              `
            INSERT INTO whatsapp_message_logs (session_id, jid, message_text, status, error_message)
            VALUES ($1, $2, $3, 'failed', $4)
          `,
              [job.sessionId, job.jid, job.message.text, errorMessage],
            )
            .catch(() => {});

          if (job.userId && job.scheduleId) {
            try {
              await updateSchedule(job.userId, job.scheduleId, {
                status: "failed",
                error:
                  errorMessage ||
                  "Limite máximo de tentativas de conexão esgotado.",
              });
            } catch (repoError: any) {
              logger.error(
                `[Worker] Erro ao gravar status de falha: ${repoError.message}`,
              );
            }
          }
        }
      }
    }

    await delay(700);
  }
}
