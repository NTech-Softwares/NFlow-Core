import { messageQueue } from "../../../shared/queue/messageQueue";

import { getWhatsapp } from "../../../providers/whatsapp/baileys/client";

import { QueueJob } from "../../../shared/types/QueueJob";
import { logger } from "../../../shared/utils/logger";

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function startWorker() {
  logger.info("Worker iniciado");

  while (true) {
    if (messageQueue.length > 0) {
      const job = messageQueue.shift();

      if (!job) continue;

      const sock = getWhatsapp();

      try {
        logger.info(`Processando job ----> ${job}`);

        const isGroup = job.jid.endsWith("@g.us");

        const isLid = job.jid.endsWith("@lid");

        const isUser = job.jid.endsWith("@s.whatsapp.net");

        /*
                 =========================
                 PAYLOAD DA MENSAGEM
                 =========================
                */

        const messagePayload = job.imagePath
          ? {
              image: {
                url: job.imagePath,
              },

              caption: job.message.text,
            }
          : {
              text: job.message.text,
            };

        /*
                 =========================
                 GRUPOS E LIDS
                 =========================
                */

        if (isGroup || isLid) {
          await sock.sendPresenceUpdate("composing", job.jid);

          await delay(2000);

          const response = await sock.sendMessage(job.jid, messagePayload);

          logger.info(`Mensagem enviada: ${response}`);
        } else if (isUser) {
          /*
                 =========================
                 USUÁRIOS
                 =========================
                */
          const [result] = await sock.onWhatsApp(job.jid);

          logger.info(`Lookup: ${result}`);

          if (!result?.exists) {
            console.log("Número não existe no WhatsApp");

            continue;
          }

          await sock.sendPresenceUpdate("composing", result.jid);

          await delay(2000);

          const response = await sock.sendMessage(result.jid, messagePayload);

          logger.info(`Mensagem enviada: ${response}`);
        } else {
          /*
                 =========================
                 JID INVÁLIDO
                 =========================
                */
          console.log("JID inválido:", job.jid);
        }

        /*
                 =========================
                 DELAY ANTI-SPAM
                 =========================
                */

        const randomDelay = Math.floor(Math.random() * 5000) + 3000;

        await delay(randomDelay);
      } catch (error) {
        logger.error(`ERRO AO ENVIAR MENSAGEM: ${error}`);
      }
    }

    await delay(1000);
  }
}
