import { FormattedMessage } from "../../../../shared/utils/message";
import { processFlow } from "../engine/flowEngine";
import { messageQueue } from "../../../../shared/queue/messageQueue";

// 🎯 AGORA RECEBE O sessionId (Quem é o dono do bot: ex 'mateus_session')
const MessageHandler = async (message: FormattedMessage, sessionId: string) => {
  const jid = message.key.remoteJid!;
  const content = message.content?.trim().toLowerCase() || "";

  // 🎯 Passa o sessionId para o motor saber qual JSON e qual mapa de estados carregar
  const result = await processFlow(jid, content, sessionId);

  messageQueue.push({
    sessionId, // Garante que a fila sabe por qual socket disparar de volta
    jid,
    message: {
      text: result.messages.join("\n"),
    },
  });
};

export default MessageHandler;
