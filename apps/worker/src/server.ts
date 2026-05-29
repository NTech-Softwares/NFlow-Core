import { messageQueue } from "../../../shared/queue/messageQueue";
import { getWhatsapp } from "../../../providers/whatsapp/baileys/client";
import { logger } from "../../../shared/utils/logger";

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/*
 =========================
 PAYLOAD DA MENSAGEM
 =========================
*/
function createMessagePayload(job: any) {
  return job.imagePath
    ? {
        image: {
          url: job.imagePath,
        },
        caption: job.message.text,
      }
    : {
        text: job.message.text,
      };
}

/*
 =========================
 ENVIO PARA GRUPOS
 =========================
*/
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

/*
 =========================
 ENVIO PARA LID
 =========================
*/
async function sendLidMessage(sock: any, job: any, messagePayload: any) {
  logger.info(
    `\n[Sessão: ${job.sessionId}] === ENVIO LID ===\nJID: ${job.jid}`,
  );

  await sock.sendPresenceUpdate("composing", job.jid);
  await delay(1000);

  const response = await sock.sendMessage(job.jid, messagePayload);

  logger.info(
    `\n[Sessão: ${job.sessionId}] === MENSAGEM ENVIADA ===\nJID: ${job.jid}\nID: ${response.key.id}`,
  );
}

/*
 =========================
 ENVIO PARA PRIVADOS
 =========================
*/
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

  logger.info(
    `\n[Sessão: ${job.sessionId}] === MENSAGEM ENVIADA ===\nJID: ${realJid}\nID: ${response.key.id}`,
  );
}

/*
 =========================
 WORKER CORE
 =========================
*/
export async function startWorker() {
  logger.info("Worker iniciado operando em modo Multi-Tenant");

  while (true) {
    if (messageQueue.length > 0) {
      const job = messageQueue.shift();

      if (!job) {
        await delay(700);
        continue;
      }

      try {
        // 🎯 CAPTURA DINÂMICA: Passa o sessionId do job para pegar o socket correto do cliente dono do disparo
        const sock = getWhatsapp(job.sessionId);

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
            `[Sessão: ${job.sessionId}] JID Inválido ou desconhecido: ${job.jid}`,
          );
        }

        /*
         =========================
         DELAY ANTI-BAN RATELIMIT
         =========================
        */
        const randomDelay = Math.floor(Math.random() * 2000) + 2000;
        await delay(randomDelay);
      } catch (error: any) {
        logger.error(`
        ==================================================
        ERRO CRÍTICO NO WORKER (JOB REJEITADO)
        ==================================================
        SESSÃO: ${job.sessionId}
        ALVO: ${job.jid}
        MOTIVO: ${error.message || error}
        ==================================================
        `);
        // Opcional: Se o token caiu ou a sessão não foi iniciada, você poderia tratar logs ou alertas aqui
      }
    }

    await delay(700);
  }
}
