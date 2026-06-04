import { FormattedMessage } from "../../../../shared/utils/message";
import { processFlow } from "../../../../modules/flows/engine/flow.engine";
import { messageQueue } from "../../../../shared/queue/messageQueue";

const MessageHandler = async (message: FormattedMessage, sessionId: string) => {
  const jid = message.key.remoteJid!;
  const content = message.content?.trim().toLowerCase() || "";

  // 🎯 Aciona o motor independente passando os dados capturados do Baileys
  const result = await processFlow(
    jid,
    content,
    sessionId,
    message.pushName || "",
    message.fromMe,
    message.key.id || "",
  );

  // Se não houver mensagens para responder, corta a execução aqui e não manda nada
  if (!result.messages || result.messages.length === 0) return;

  // 🔄 ATUALIZADO: Usando messageText ao invés de message: { text }
  messageQueue.push({
    sessionId,
    jid,
    messageText: result.messages.join("\n"),
  });
};

export default MessageHandler;
