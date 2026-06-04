import { messageQueue } from "../../shared/queue/messageQueue";
import { logger } from "../../shared/utils/logger";
import * as scheduleRepository from "./schedule.repository";

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function startScheduleWorker() {
  logger.info("⏰ Worker de Agendamentos (Postgres) iniciado com sucesso!");

  while (true) {
    try {
      // 1. Faxina de agendamentos cancelados
      const canceledSchedules =
        await scheduleRepository.getAllCanceledSchedules();

      if (canceledSchedules.length > 0) {
        logger.info(
          `[Scheduler] Faxina: Encontrados ${canceledSchedules.length} agendamentos cancelados.`,
        );
        for (const canceled of canceledSchedules) {
          await scheduleRepository
            .deleteSchedule(canceled.userId, canceled.id)
            .catch((err) =>
              logger.error(`Erro ao deletar [${canceled.id}]: ${err.message}`),
            );
        }
      }

      // 2. Processamento de disparos no tempo correto
      const pendingSchedules =
        await scheduleRepository.getAllPendingSchedules();
      const now = new Date();

      // Utiliza a propriedade correta unificada da interface
      const dueSchedules = pendingSchedules.filter((schedule) => {
        const scheduleDate = new Date(schedule.scheduledAt);
        return scheduleDate <= now;
      });

      if (dueSchedules.length > 0) {
        logger.info(
          `[Scheduler] ${dueSchedules.length} mensagens prontas para disparo.`,
        );

        for (const schedule of dueSchedules) {
          logger.info(
            `[Scheduler] Encaminhando agendamento [${schedule.id}] para a fila de envio.`,
          );

          // 🔄 ATUALIZADO: Formato plano, passando userId e scheduleId diretamente
          messageQueue.push({
            sessionId: schedule.sessionId,
            jid: schedule.remoteJid,
            messageText: schedule.message.text,
            imagePath: schedule.message.mediaUrl || undefined,
            userId: schedule.userId,
            scheduleId: schedule.id,
          });

          // Atualiza o status para enviado
          await scheduleRepository.updateSchedule(
            schedule.userId,
            schedule.id,
            {
              status: "sent",
              payload: {
                ...schedule.payload,
                sentAt: new Date().toISOString(),
              },
            },
          );
        }
      }
    } catch (error: any) {
      logger.error(
        `[Scheduler] Erro crítico no loop: ${error.message || error}`,
      );
    }

    // Intervalo de verificação da fila (30 segundos)
    await delay(30000);
  }
}

if (require.main === module) {
  (async () => {
    logger.info("[Scheduler] Execução direta detectada isoladamente.");
    await startScheduleWorker();
  })();
}
