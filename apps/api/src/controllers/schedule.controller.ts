import { Request, Response } from "express";
import { ApiSchedulerService } from "../services/schedule.service";
import { logger } from "../../../../shared/utils/logger";

export class SchedulerController {
  /**
   * POST /schedules
   * Adiciona um novo agendamento usando o contexto do Token JWT
   */
  async create(req: Request, res: Response): Promise<Response> {
    try {
      // 1. Pega o userId direto do Token autenticado
      const userId = req.user.id;

      // 2. Define o sessionId baseado no usuário (ou use req.user.sessionId se seu token já carregar isso)
      const sessionId = req.user.whatsappSessionId || `${userId}_session`;

      // 3. Pega apenas os dados de envio do body
      const { remoteJid, text, scheduledAt, mediaUrl } = req.body;

      // Validação básica atualizada (sem exigir userId e sessionId vindos do front)
      if (!remoteJid || !text || !scheduledAt) {
        return res.status(400).json({
          error: "Campos obrigatórios ausentes: remoteJid, text, scheduledAt.",
        });
      }

      // 4. Passa os dados consolidados para o Service
      const schedule = await ApiSchedulerService.add({
        userId,
        sessionId,
        remoteJid,
        text,
        scheduledAt,
        mediaUrl,
      });

      return res.status(201).json({
        success: true,
        message: "Agendamento criado com sucesso!",
        data: schedule,
      });
    } catch (error: any) {
      logger.error(
        `[API Controller] Erro ao criar agendamento: ${error.message}`,
      );
      return res.status(400).json({
        error: error.message || "Erro interno ao processar agendamento.",
      });
    }
  }

  /**
   * DELETE /schedules/:scheduleId
   * Cancela/Remove um agendamento validando o dono pelo Token
   */
  async delete(req: Request, res: Response): Promise<Response> {
    try {
      // Pega o id do token e o id do agendamento do parâmetro limpo da URL
      const userId = req.user.id;
      const { scheduleId } = req.params;

      if (!scheduleId) {
        return res
          .status(400)
          .json({ error: "O parâmetro scheduleId é obrigatório." });
      }

      // Remove garantindo que o registro pertence a quem está logado
      await ApiSchedulerService.remove(userId, scheduleId);

      return res.status(200).json({
        success: true,
        message: "Agendamento cancelado/removido com sucesso.",
      });
    } catch (error: any) {
      logger.error(
        `[API Controller] Erro ao deletar agendamento: ${error.message}`,
      );
      return res.status(400).json({
        error: error.message || "Erro interno ao deletar agendamento.",
      });
    }
  }

  /**
   * GET /schedules
   * Lista os agendamentos do usuário autenticado
   */
  async list(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user.id;
      const schedules = await ApiSchedulerService.list(userId);
      return res.status(200).json({ success: true, data: schedules });
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }
}
