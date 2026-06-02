import { proto, WAMessage } from "@whiskeysockets/baileys";
import { logger } from "./logger";

export type FormattedMessage = {
  key: proto.IMessageKey;
  // Convertemos ou aceitamos o formato do Long do proto
  messageTimestamp: number | Long | null | undefined;
  pushName: string | null | undefined;
  fromMe: boolean;
  content: string | null;
};

/**
 * @param message
 * @returns a mensagem vindo do Baileys formatada para algo mais amigável.
 */
export const getMessage = (
  message: WAMessage,
  sock?: any,
): FormattedMessage | null => {
  try {
    // 1. Extrai o número limpo do Bot (ex: 5511999999999)
    const botJid = sock?.user?.id?.split(":")[0]?.split("@")[0];
    const botLid = sock?.user?.lid?.split(":")[0]?.split("@")[0];

    // 2. Verifica quem disparou a mensagem no ecossistema multi-device
    // Em DMs, quando o próprio telefone envia, o Baileys popula o 'key.participant'
    const senderJid = message.key.participant || message.key.remoteJid;
    const senderClean = senderJid?.split(":")[0]?.split("@")[0];

    // 3. Regra de Ouro: É do próprio atendente se o Baileys marcou como true,
    // OU se o remetente real bater com o JID/LID do robô logado
    let isFromMe = message.key.fromMe || false;

    if (!isFromMe && senderClean) {
      if (senderClean === botJid || senderClean === botLid) {
        isFromMe = true;
      }
    }

    return {
      key: message.key,
      messageTimestamp: message.messageTimestamp,
      pushName: message.pushName,
      fromMe: isFromMe, // Agora retornará TRUE se o atendente digitou no celular
      content:
        message.message?.conversation ||
        message.message?.extendedTextMessage?.text ||
        message.message?.imageMessage?.caption ||
        message.message?.videoMessage?.caption ||
        null,
    };
  } catch (error) {
    logger.error(error);
    return null;
  }
};
