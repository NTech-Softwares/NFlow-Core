import { Request, Response } from "express";
import { ApiCustomServicesService } from "../services/customServices.service";
import { logger } from "../../../../shared/utils/logger";

export class CustomServicesController {
  /**
   * GET /custom-services/services
   * Retorna as configurações e catálogo de serviços do Tenant
   */
  async getServices(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user.id;
      const config = await ApiCustomServicesService.getConfig(userId);

      return res.status(200).json({
        success: true,
        data: config || { services: [], maxSimultaneousSlots: 1 },
      });
    } catch (error: any) {
      logger.error(
        `[CustomServices] Erro ao buscar configurações: ${error.message}`,
      );
      return res
        .status(400)
        .json({ error: error.message || "Erro ao buscar serviços." });
    }
  }

  /**
   * POST /custom-services/services
   * Salva os serviços, limite de concorrência e mensagem customizada do painel
   */
  async saveServices(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user.id;
      const { services, maxSimultaneousSlots, confirmationMessage } = req.body;

      if (!Array.isArray(services)) {
        return res.status(400).json({
          error: "O campo 'services' deve ser um array válido.",
        });
      }

      const updatedConfig = await ApiCustomServicesService.saveConfig(userId, {
        services,
        maxSimultaneousSlots,
        confirmationMessage,
      });

      return res.status(200).json({
        success: true,
        message: "Configurações de agendamento atualizadas com sucesso!",
        data: updatedConfig,
      });
    } catch (error: any) {
      logger.error(
        `[CustomServices] Erro ao salvar configurações: ${error.message}`,
      );
      return res
        .status(400)
        .json({ error: error.message || "Erro ao salvar configurações." });
    }
  }

  /**
   * GET /custom-services/appointments
   * Lista os agendamentos dos clientes gerados pelo bot para o Tenant logado
   */
  async listAppointments(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user.id;
      const appointments =
        await ApiCustomServicesService.listAppointments(userId);

      return res.status(200).json({
        success: true,
        data: appointments,
      });
    } catch (error: any) {
      logger.error(
        `[CustomServices] Erro ao listar consultas: ${error.message}`,
      );
      return res
        .status(400)
        .json({ error: error.message || "Erro ao listar agendamentos." });
    }
  }

  /**
   * DELETE /custom-services/appointments/:appointmentId
   * Cancela uma reserva de cliente por dentro do painel
   */
  async deleteAppointment(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user.id;
      const { appointmentId } = req.params;

      if (!appointmentId) {
        return res
          .status(400)
          .json({ error: "O parâmetro appointmentId é obrigatório." });
      }

      await ApiCustomServicesService.cancelAppointment(userId, appointmentId);

      return res.status(200).json({
        success: true,
        message: "Agendamento cancelado com sucesso no painel.",
      });
    } catch (error: any) {
      logger.error(
        `[CustomServices] Erro ao deletar agendamento: ${error.message}`,
      );
      return res
        .status(400)
        .json({ error: error.message || "Erro ao cancelar agendamento." });
    }
  }
}
