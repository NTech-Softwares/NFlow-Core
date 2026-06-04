import { logger } from "../../shared/utils/logger";
import { messageQueue } from "../../shared/queue/messageQueue";
import { getInactiveChats, updateChatStatus } from "./sessionStore";

// Configuração do Worker
const INACTIVITY_LIMIT_MINUTES = 31; // Tempo máximo sem interação
const CHECK_INTERVAL_MS = 15 * 60 * 1000; // Roda a verificação a cada 15 minutos

export function startChatWorker() {
  logger.info(
    `[Chat Worker] Iniciado. Monitorando inatividade (${INACTIVITY_LIMIT_MINUTES} min) a cada ${CHECK_INTERVAL_MS / 60000} min.`,
  );

  setInterval(async () => {
    try {
      logger.info("[Chat Worker] Varrendo banco em busca de chats inativos...");

      const inactiveChats = await getInactiveChats(INACTIVITY_LIMIT_MINUTES);

      if (!inactiveChats || inactiveChats.length === 0) {
        return;
      }

      logger.info(
        `[Chat Worker] ${inactiveChats.length} chat(s) inativo(s) encontrado(s). Iniciando encerramento...`,
      );

      for (const chat of inactiveChats) {
        const { session_id, remote_jid } = chat;

        // 1. Volta o status para "automatico" e limpa o flow (Sua função nativa já faz isso lindamente)
        await updateChatStatus(remote_jid, session_id, "automatico");

        // 2. Enfileira a mensagem de aviso na esteira principal de envios
        // 🔄 ATUALIZADO: Usando messageText
        messageQueue.push({
          sessionId: session_id,
          jid: remote_jid,
          messageText:
            "⚠️ *Atendimento Encerrado*\n\nSeu atendimento foi encerrado devido à inatividade. Se precisar de mais alguma coisa, basta nos enviar uma nova mensagem e você será atendido prontamente!",
        });

        logger.info(
          `[Chat Worker] Sessão ${session_id} | Atendimento encerrado para o número: ${remote_jid}`,
        );
      }
    } catch (error: any) {
      logger.error(
        `[Chat Worker] Falha ao processar encerramento de chats: ${error.message}`,
      );
    }
  }, CHECK_INTERVAL_MS);
}
