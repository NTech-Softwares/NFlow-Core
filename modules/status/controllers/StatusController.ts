import { Request, Response } from "express";
import { WhatsappService } from "../../whatsapp/whatsapp.service"; // 🚀 Importando o service correto
import { logger } from "../../../shared/utils/logger";

// Instancia o serviço que possui a regra de inicialização sob demanda
const whatsappService = new WhatsappService();

class StatusController {
  async handle(req: Request, res: Response) {
    try {
      const user = (req as any).user;

      if (!user || !user.id) {
        logger.error(
          "Tentativa de buscar status sem um token de usuário válido (Sem ID no req.user).",
        );
        return res
          .status(401)
          .json({ error: "Não autorizado ou sessão não identificada." });
      }

      // 🎯 Ajustado o fallback para o padrão correto 'sess_UUID' caso não venha no JWT
      const sessionId = user.whatsappSessionId || `sess_${user.id}`;

      // 🚀 AGORA SIM: Usa o WhatsappService para consultar E iniciar o Baileys se necessário
      const whatsappSession = await whatsappService.getStatus(sessionId);

      logger.info(
        `Status do WhatsApp requisitado pelo usuário: ${user.email} (Sessão: ${sessionId}) -> Status: ${whatsappSession.status}`,
      );

      return res.json({
        api: "Online",
        status: whatsappSession.status,
        qr: whatsappSession.qr || null,
        worker: "Online",
      });
    } catch (error: any) {
      logger.error(
        `Erro ao buscar status do WhatsApp Multi-Tenant: ${error.message}`,
      );
      return res
        .status(500)
        .json({ error: "Erro interno ao consultar o status da sessão." });
    }
  }
}

export { StatusController };
