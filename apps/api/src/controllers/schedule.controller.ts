import { Request, Response } from "express";
import { ApiSchedulerService } from "../services/schedule.service";
import { logger } from "../../../../shared/utils/logger";

export class SchedulerController {
  /**
   * POST /schedules
   * Adiciona um novo agendamento individual usando o contexto do Token JWT
   */
  async create(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user.id;
      const sessionId = req.user.whatsappSessionId || `${userId}_session`;
      const { remoteJid, text, scheduledAt, mediaUrl } = req.body;

      if (!remoteJid || !text || !scheduledAt) {
        return res.status(400).json({
          error: "Campos obrigatórios ausentes: remoteJid, text, scheduledAt.",
        });
      }

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
   * POST /schedules/campaigns
   * Salva um template de campanha e os múltiplos horários de disparo
   */
  async createCampaign(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user.id;
      const sessionId = req.user.whatsappSessionId || `${userId}_session`;

      const { name, text, recipients, sendAtList, mediaUrl } = req.body;

      // Validações rigorosas para evitar arrays vazios corrompendo o worker
      if (!name || !text || !recipients || !sendAtList) {
        return res.status(400).json({
          error:
            "Campos obrigatórios ausentes: name, text, recipients, sendAtList.",
        });
      }

      if (!Array.isArray(recipients) || recipients.length === 0) {
        return res.status(400).json({
          error: "A lista de destinatários (recipients) não pode estar vazia.",
        });
      }

      if (!Array.isArray(sendAtList) || sendAtList.length === 0) {
        return res.status(400).json({
          error: "A lista de horários (sendAtList) não pode estar vazia.",
        });
      }

      await ApiSchedulerService.addCampaign({
        userId,
        sessionId,
        name,
        text,
        recipients,
        sendAtList,
        mediaUrl,
      });

      return res.status(201).json({
        success: true,
        message: "Campanha agendada com sucesso!",
      });
    } catch (error: any) {
      logger.error(`[API Controller] Erro ao criar campanha: ${error.message}`);
      return res.status(400).json({
        error: error.message || "Erro interno ao processar campanha.",
      });
    }
  }

  /**
   * DELETE /schedules/:scheduleId
   * Cancela/Remove um agendamento validando o dono pelo Token
   */
  async delete(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user.id;
      const { scheduleId } = req.params;

      if (!scheduleId) {
        return res
          .status(400)
          .json({ error: "O parâmetro scheduleId é obrigatório." });
      }

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
