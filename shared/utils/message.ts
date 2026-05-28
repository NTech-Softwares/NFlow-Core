import { proto, WAMessage } from "@whiskeysockets/baileys";
import { logger } from "./logger";

export type FormattedMessage = {
  key: proto.IMessageKey;
  // Convertemos ou aceitamos o formato do Long do proto
  messageTimestamp: number | Long | null | undefined;
  pushName: string | null | undefined;
  content: string | null;
};

/**
 * @param message
 * @returns a mensagem vindo do Baileys formatada para algo mais amigável.
 */
export const getMessage = (message: WAMessage): FormattedMessage | null => {
  try {
    return {
      key: message.key,
      messageTimestamp: message.messageTimestamp,
      pushName: message.pushName,
      content:
        message.message?.conversation ||
        message.message?.extendedTextMessage?.text ||
        message.message?.imageMessage?.caption || // Captura legenda de imagem
        message.message?.videoMessage?.caption || // Captura legenda de vídeo
        null, // Fallback caso não tenha nenhum texto
    };
  } catch (error) {
    logger.error(error);
    return null; // Retorno seguro em caso de falha
  }
};
