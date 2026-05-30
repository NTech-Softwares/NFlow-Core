import { FormattedMessage } from "../../../../shared/utils/message";
import { processFlow } from "../../../../modules/flows/engine/flow.engine";
import { messageQueue } from "../../../../shared/queue/messageQueue";

const MessageHandler = async (message: FormattedMessage, sessionId: string) => {
  const jid = message.key.remoteJid!;
  const content = message.content?.trim().toLowerCase() || "";

  // 🎯 Aciona o motor independente passando os dados capturados do Baileys
  const result = await processFlow(jid, content, sessionId);

  messageQueue.push({
    sessionId,
    jid,
    message: {
      text: result.messages.join("\n"),
    },
  });
};

export default MessageHandler;
