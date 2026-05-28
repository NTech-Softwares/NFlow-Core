import { FormattedMessage } from "../../../../shared/utils/message";
import { processFlow } from "../engine/flowEngine";
import { messageQueue } from "../../../../shared/queue/messageQueue";

const MessageHandler = async (message: FormattedMessage) => {
  const jid = message.key.remoteJid!;
  const content = message.content?.trim().toLowerCase() || "";
  const result = await processFlow(jid, content);

  messageQueue.push({
    jid,
    message: {
      text: result.messages.join("\n"),
    },
  });
};

export default MessageHandler;
