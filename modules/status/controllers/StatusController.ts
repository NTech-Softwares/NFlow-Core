import { Request, Response } from "express";
import { getSessionStatus } from "../../../providers/whatsapp/baileys/client";
import { logger } from "../../../shared/utils/logger";

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

      // 🎯 Se o whatsappSessionId não veio no JWT, monta dinamicamente usando o padrão do auth.service.ts
      const sessionId = user.whatsappSessionId || `${user.id}_session`;

      // Consulta o status em tempo real da instância isolada
      const whatsappSession = getSessionStatus(sessionId);

      logger.info(
        `Status do WhatsApp requisitado pelo usuário: ${user.email} (Sessão: ${sessionId}) -> Status: ${whatsappSession ? whatsappSession.status : "unknown"}`,
      );

      return res.json({
        api: "Online",
        status: whatsappSession ? whatsappSession.status : "DISCONNECTED",
        qr: whatsappSession ? whatsappSession.qr : null,
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
