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
  logger.info(`
  =========================
  ENVIO GRUPO
  =========================
  ${job.jid}
  =========================
  `);

  await sock.sendPresenceUpdate("composing", job.jid);

  await delay(1000);

  const response = await sock.sendMessage(job.jid, messagePayload);

  logger.info(`
  =========================
  MENSAGEM ENVIADA
  =========================
  JID: ${job.jid}
  MESSAGE_ID: ${response.key.id}
  =========================
  `);
}

/*
 =========================
 ENVIO PARA LID
 =========================
*/

async function sendLidMessage(sock: any, job: any, messagePayload: any) {
  logger.info(`
  =========================
  ENVIO LID
  =========================
  ${job.jid}
  =========================
  `);

  await sock.sendPresenceUpdate("composing", job.jid);

  await delay(1000);

  const response = await sock.sendMessage(job.jid, messagePayload);

  logger.info(`
  =========================
  MENSAGEM ENVIADA
  =========================
  JID: ${job.jid}
  MESSAGE_ID: ${response.key.id}
  =========================
  `);
}

/*
 =========================
 ENVIO PARA PRIVADOS
 =========================
*/

async function sendPrivateMessage(sock: any, job: any, messagePayload: any) {
  logger.info(`
  =========================
  ENVIO PRIVADO
  =========================
  ${job.jid}
  =========================
  `);

  const number = job.jid.replace("@s.whatsapp.net", "");

  const [result] = await sock.onWhatsApp(number);

  logger.info(`
  =========================
  WHATSAPP CHECK
  =========================
  ${JSON.stringify(result)}
  =========================
  `);

  if (!result?.exists) {
    logger.error(`
    =========================
    NÚMERO NÃO EXISTE
    =========================
    ${job.jid}
    =========================
    `);

    return;
  }

  const realJid = result.jid;

  logger.info(`
  =========================
  REAL JID
  =========================
  ${realJid}
  =========================
  `);

  await sock.presenceSubscribe(realJid);

  await delay(500);

  const response = await sock.sendMessage(realJid, messagePayload);

  logger.info(`
  =========================
  MENSAGEM ENVIADA
  =========================
  JID: ${realJid}
  MESSAGE_ID: ${response.key.id}
  =========================
  `);
}

/*
 =========================
 WORKER
 =========================
*/

export async function startWorker() {
  logger.info("Worker iniciado");

  while (true) {
    if (messageQueue.length > 0) {
      const job = messageQueue.shift();

      if (!job) {
        await delay(700);

        continue;
      }

      try {
        const sock = getWhatsapp();

        if (!sock) {
          logger.error("WhatsApp não conectado");

          await delay(2000);

          continue;
        }

        logger.info(`
        =========================
        PROCESSANDO JOB
        =========================
        JID: ${job.jid}
        TEXTO: ${job.message.text}

        IMAGE: ${job.imagePath || "NÃO"}
        =========================
        `);

        /*
         =========================
         PAYLOAD
         =========================
        */

        const messagePayload = createMessagePayload(job);

        /*
         =========================
         TIPOS
         =========================
        */

        const isGroup = job.jid.endsWith("@g.us");

        const isUser = job.jid.endsWith("@s.whatsapp.net");

        const isLid = job.jid.endsWith("@lid");

        /*
         =========================
         GRUPOS
         =========================
        */

        if (isGroup) {
          await sendGroupMessage(sock, job, messagePayload);
        } else if (isUser) {

        /*
         =========================
         PRIVADOS
         =========================
        */
          await sendPrivateMessage(sock, job, messagePayload);
        } else if (isLid) {

        /*
         =========================
         LID
         =========================
        */
          await sendLidMessage(sock, job, messagePayload);
        } else {

        /*
         =========================
         JID INVÁLIDO
         =========================
        */
          logger.error(`
          =========================
          JID INVÁLIDO
          =========================
          ${job.jid}
          =========================
          `);
        }

        /*
         =========================
         DELAY ANTI-SPAM
         =========================
        */

        const randomDelay = Math.floor(Math.random() * 2000) + 2000;

        await delay(randomDelay);
      } catch (error) {
        logger.error(`
        =========================
        ERRO AO ENVIAR
        =========================
        ${error}
        =========================
        `);
      }
    }

    await delay(700);
  }
}
