import { Request, Response } from "express";
import { ApiAttendanceService } from "../services/attendance.service";
import { logger } from "../../../../shared/utils/logger";

export class AttendanceController {
  /**
   * GET /attendance/sessions
   */
  async listSessions(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user.id;
      const sessionId = req.user.whatsappSessionId || `${userId}_session`;

      const sessions =
        await ApiAttendanceService.getSessionsInHumanAttendance(sessionId);

      return res.status(200).json({
        success: true,
        sessions,
      });
    } catch (error: any) {
      logger.error(
        `[Attendance Controller] Erro ao listar sessões: ${error.message}`,
      );
      return res.status(400).json({
        error: error.message || "Erro interno ao listar filas de atendimento.",
      });
    }
  }

  /**
   * POST /attendance/status
   * Acionado pelo botão de "Aceitar/Iniciar Atendimento" no front mudando para 'em_atendimento'
   */
  async updateStatus(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user.id;
      const sessionId = req.user.whatsappSessionId || `${userId}_session`;
      const { remoteJid, status } = req.body;

      if (!remoteJid || !status) {
        return res
          .status(400)
          .json({ error: "Campos obrigatórios ausentes: remoteJid, status." });
      }

      await ApiAttendanceService.updateStatus({
        sessionId,
        remoteJid,
        status,
      });

      return res.status(200).json({
        success: true,
        message: `Status de atendimento atualizado para '${status}'!`,
      });
    } catch (error: any) {
      logger.error(
        `[Attendance Controller] Erro ao atualizar status: ${error.message}`,
      );
      return res.status(400).json({ error: error.message });
    }
  }

  /**
   * POST /attendance/close
   * Acionado pelo botão de "Encerrar Atendimento / Voltar para o Bot"
   */
  async closeAttendance(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user.id;
      const sessionId = req.user.whatsappSessionId || `${userId}_session`;
      const { remoteJid } = req.body;

      if (!remoteJid) {
        return res
          .status(400)
          .json({ error: "O campo remoteJid é obrigatório." });
      }

      await ApiAttendanceService.closeAndRouteToBot({
        sessionId,
        remoteJid,
      });

      return res.status(200).json({
        success: true,
        message: "Atendimento encerrado e bot reativado com sucesso.",
      });
    } catch (error: any) {
      logger.error(
        `[Attendance Controller] Erro ao encerrar atendimento: ${error.message}`,
      );
      return res.status(400).json({ error: error.message });
    }
  }

  /**
   * 🟢 NOVO: POST /attendance/delete
   * Acionado pelo botão de "Excluir Atendimento" do painel
   */
  async deleteAttendance(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user.id;
      const sessionId = req.user.whatsappSessionId || `${userId}_session`;
      const { remoteJid } = req.body;

      if (!remoteJid) {
        return res
          .status(400)
          .json({ error: "O campo remoteJid é obrigatório para exclusão." });
      }

      await ApiAttendanceService.deleteAttendance({
        sessionId,
        remoteJid,
      });

      return res.status(200).json({
        success: true,
        message: "Atendimento deletado da memória com sucesso.",
      });
    } catch (error: any) {
      logger.error(
        `[Attendance Controller] Erro ao deletar atendimento: ${error.message}`,
      );
      return res.status(400).json({ error: error.message });
    }
  }
}
