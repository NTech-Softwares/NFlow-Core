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
      // ========================================================
      // 1. PROCESSAMENTO DE MENSAGENS INDIVIDUAIS (1 PARA 1)
      // ========================================================
      const canceledSchedules =
        await scheduleRepository.getAllCanceledSchedules();
      if (canceledSchedules.length > 0) {
        for (const canceled of canceledSchedules) {
          await scheduleRepository
            .deleteSchedule(canceled.userId, canceled.id)
            .catch(() => {});
        }
      }

      const pendingSchedules =
        await scheduleRepository.getAllPendingSchedules();
      const now = new Date();

      const dueSchedules = pendingSchedules.filter(
        (schedule) => new Date(schedule.scheduledAt) <= now,
      );

      if (dueSchedules.length > 0) {
        for (const schedule of dueSchedules) {
          messageQueue.push({
            sessionId: schedule.sessionId,
            jid: schedule.remoteJid,
            messageText: schedule.message.text,
            imagePath: schedule.message.mediaUrl || undefined,
            userId: schedule.userId,
            scheduleId: schedule.id,
          });

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

      // ========================================================
      // 2. PROCESSAMENTO DE CAMPANHAS EM MASSA (1 PARA N)
      // ========================================================
      const dueCampaigns = await scheduleRepository.getDueCampaignSchedules();

      if (dueCampaigns.length > 0) {
        logger.info(
          `[Scheduler] ${dueCampaigns.length} horários de campanhas prontos para processamento.`,
        );

        for (const campaignSchedule of dueCampaigns) {
          const template = campaignSchedule.template;

          if (
            template &&
            template.recipients &&
            template.recipients.length > 0
          ) {
            logger.info(
              `[Scheduler] Gerando ${template.recipients.length} jobs para a campanha: ${template.name}`,
            );

            // Adiciona cada destinatário da campanha na fila de envios
            for (const recipientJid of template.recipients) {
              messageQueue.push({
                sessionId: campaignSchedule.sessionId,
                jid: recipientJid,
                messageText: template.message.text,
                imagePath: template.message.mediaUrl || undefined,
                userId: template.userId,
                // Aqui usamos o ID do horário para possível auditoria futura
                scheduleId: campaignSchedule.id,
              });
            }
          }

          // Marca ESTE horário da campanha como processado
          await scheduleRepository.updateCampaignScheduleStatus(
            campaignSchedule.id,
            "processed",
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
