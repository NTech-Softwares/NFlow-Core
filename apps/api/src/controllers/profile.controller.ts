import { Request, Response } from "express";
import { getProfile, updateProfileData } from "../services/profile.service";
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
   * (Mantendo a rota original, mas atualizando todos os dados do perfil)
   */
  async updateProfile(req: Request, res: Response): Promise<Response> {
    try {
      const user = (req as any).user;
      if (!user || !user.id) {
        return res.status(401).json({ error: "Não autorizado." });
      }

      const { businessHours, companyName, businessType, address } = req.body;

      const updatedUser = await updateProfileData(user.id, {
        businessHours,
        companyName,
        businessType,
        address,
      });

      logger.info(
        `[Profile] Perfil/Horários atualizados para o usuário: ${user.id}`,
      );

      return res.json({ success: true, data: updatedUser });
    } catch (error: any) {
      logger.error(
        `Erro ao atualizar perfil/horário de atendimento: ${error.message}`,
      );
      return res.status(400).json({ error: error.message });
    }
  }
}
