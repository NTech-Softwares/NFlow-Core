import { Request, Response } from "express";
import { getProfile, updateBusinessHours } from "../services/profile.service";
import { logger } from "../../../../shared/utils/logger";

export class ProfileController {
  /**
   * GET /api/users/profile
   */
  async show(req: Request, res: Response): Promise<Response> {
    try {
      const user = (req as any).user;
      if (!user || !user.id) {
        return res.status(401).json({ error: "Não autorizado." });
      }

      const profile = await getProfile(user.id);
      return res.json(profile);
    } catch (error: any) {
      logger.error(`Erro ao buscar perfil do usuário: ${error.message}`);
      return res.status(400).json({ error: error.message });
    }
  }

  /**
   * PUT /api/users/profile/business-hours
   */
  async updateHours(req: Request, res: Response): Promise<Response> {
    try {
      const user = (req as any).user;
      if (!user || !user.id) {
        return res.status(401).json({ error: "Não autorizado." });
      }

      const { businessHours } = req.body;

      if (!businessHours) {
        return res
          .status(400)
          .json({ error: "Configuração de horários não fornecida." });
      }

      const updatedHours = await updateBusinessHours(user.id, businessHours);

      logger.info(
        `[Profile] Horário de funcionamento atualizado para o usuário: ${user.id}`,
      );
      return res.json({ success: true, businessHours: updatedHours });
    } catch (error: any) {
      logger.error(
        `Erro ao atualizar horário de atendimento: ${error.message}`,
      );
      return res.status(400).json({ error: error.message });
    }
  }
}
