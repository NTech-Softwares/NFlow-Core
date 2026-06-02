import { messageQueue } from "../../shared/queue/messageQueue";
import { logger } from "../../shared/utils/logger";
import * as scheduleRepository from "./schedule.repository";

/**
 * Função utilitária para pausar a execução (delay)
 */
function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * ⏰ WORKER DE AGENDAMENTO (O Despertador)
 * Varre os arquivos JSON procurando tarefas que passaram do horário e limpa registros cancelados.
 */
export async function startScheduleWorker() {
  logger.info("⏰ Worker de Agendamentos (Scheduler) iniciado com sucesso!");

  while (true) {
    try {
      // =========================================================================
      // ♻️ PASSO DE LIMPEZA: Expurga agendamentos que foram marcados como "canceled"
      // =========================================================================
      const canceledSchedules =
        (await scheduleRepository.getAllCanceledSchedules?.()) || [];

      if (canceledSchedules.length > 0) {
        logger.info(
          `[Scheduler] Faxina iniciada: Encontrados ${canceledSchedules.length} agendamentos cancelados para exclusão.`,
        );

        for (const canceled of canceledSchedules) {
          // Se o seu repositório já tiver o delete/remove, use-o.
          // Caso contrário, passamos um update nulo ou chamamos o método de deleção por tenant:
          await scheduleRepository
            .deleteSchedule(canceled.userId, canceled.id)
            .catch((err) =>
              logger.error(
                `[Scheduler] Erro ao deletar agendamento cancelado [${canceled.id}]: ${err.message}`,
              ),
            );
        }
        logger.info(`[Scheduler] Faxina concluída com sucesso.`);
      }

      // =========================================================================
      // 🚀 PASSO DE DISPARO: Processa agendamentos pendentes no horário
      // =========================================================================
      // 1. Busca absolutamente todos os agendamentos com status 'pending' de todos os tenants
      const pendingSchedules =
        await scheduleRepository.getAllPendingSchedules();

      const now = new Date();

      // 2. Filtra apenas os agendamentos que já deveriam ter saído (scheduledAt <= agora)
      const dueSchedules = pendingSchedules.filter((schedule) => {
        const scheduleDate = new Date(schedule.scheduledAt);
        return scheduleDate <= now;
      });

      if (dueSchedules.length > 0) {
        logger.info(
          `[Scheduler] Encontradas ${dueSchedules.length} mensagens prontas para disparo.`,
        );

        for (const schedule of dueSchedules) {
          logger.info(
            `[Scheduler] Encaminhando agendamento [${schedule.id}] do cliente [${schedule.userId}] para a fila de envio.`,
          );

          // 3. 🚀 PASSA O BASTÃO: Cria o Job exatamente no formato que sua messageQueue espera
          messageQueue.push({
            sessionId: schedule.sessionId,
            jid: schedule.remoteJid,
            imagePath: schedule.message.mediaUrl, // Mapeia a imagem caso o agendamento possua
            message: {
              text: schedule.message.text,
            },
            userId: schedule.userId,
            scheduleId: schedule.id,
          });

          // 4. 🔥 SINALIZAÇÃO DE SEGURANÇA: Atualiza o JSON imediatamente para 'sent'
          await scheduleRepository.updateSchedule(
            schedule.userId,
            schedule.id,
            {
              status: "sent",
              sentAt: new Date().toISOString(),
            },
          );
        }
      }
    } catch (error: any) {
      logger.error(
        `[Scheduler] Erro crítico no loop do agendador: ${error.message || error}`,
      );
    }

    // 💤 Executa a verificação a cada 30 segundos
    await delay(30000);
  }
}

/*
 =========================================================================
 💥 MECANISMO DE AUTO-INVOCAÇÃO (Execução Direta Standalone)
 =========================================================================
*/
if (require.main === module) {
  (async () => {
    logger.info("[Scheduler] Execução direta detectada isoladamente.");
    await startScheduleWorker();
  })();
}
