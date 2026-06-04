import { Request, Response } from "express";
import { whatsappService } from "../services/whatsapp.service";
import { logger } from "../../../../shared/utils/logger";
import { ApiAttendanceService } from "../services/attendance.service";

/*
 =========================
 AUXILIAR: Captura Segura do SessionId
 =========================
 */
function getTenantSessionId(req: Request): string | null {
  const user = (req as any).user;
  if (!user) return null;

  // Tenta pegar o whatsappSessionId do JWT, se não existir, monta usando o padrão estável
  return user.whatsappSessionId || (user.id ? `${user.id}_session` : null);
}

/*
 =========================
 STATUS
 =========================
 */
export async function getStatus(req: Request, res: Response) {
  try {
    const sessionId = getTenantSessionId(req);
    if (!sessionId) {
      return res
        .status(401)
        .json({ success: false, error: "Usuário não identificado" });
    }

    // Chama o service atualizado, que já vai ligar o Baileys se a sessão estiver deslogada
    const sessionData = await whatsappService.getStatus(sessionId);
    return res.json(sessionData);
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
}

/*
 =========================
 LISTAR GRUPOS
 =========================
 */
export async function listGroups(req: Request, res: Response) {
  try {
    const sessionId = getTenantSessionId(req);

    if (!sessionId) {
      logger.error("Tentativa de listar grupos sem sessão válida no req.user");
      return res.status(401).json({ success: false, error: "Sessão inválida" });
    }

    logger.info(`Buscando grupos para a sessão active: ${sessionId}`);

    // Tenta listar os grupos do serviço remoto/local
    const grupos = await whatsappService.listGroups(sessionId);

    return res.json({
      success: true,
      array: Array.isArray(grupos) ? grupos : [],
    });
  } catch (error: any) {
    // Captura o erro clássico do Baileys sincronizando ou sem grupos carregados
    logger.warn(
      `[Baileys Sync] Não foi possível listar grupos para a sessão [${getTenantSessionId(req)}] neste momento. Detalhe: ${error.message}`,
    );

    // Em vez de estourar 500, responde 200 com sucesso false e avisa o front de forma elegante
    return res.json({
      success: false,
      array: [],
      error:
        "Os grupos ainda estão sendo sincronizados pelo WhatsApp. Aguarde alguns instantes.",
    });
  }
}

/*
 =========================
 ENVIAR MENSAGEM
 =========================
 */
export async function sendMessage(req: Request, res: Response) {
  try {
    const sessionId = getTenantSessionId(req);
    if (!sessionId)
      return res.status(401).json({ success: false, error: "Sessão inválida" });

    const { number, message } = req.body;
    const image = req.file;

    if (!number || !message) {
      return res.status(400).json({
        success: false,
        error: "Número e mensagem são obrigatórios",
      });
    }

    // 🟢 O Service Core agora limpa o número e nos devolve o JID perfeito
    const remoteJid = await whatsappService.sendIndividualMessage(
      sessionId,
      number,
      message,
      image?.path,
    );

    // 🟢 Agora o Hook de atendimento recebe o JID idêntico ao do banco/WhatsApp
    await ApiAttendanceService.triggerOperatorMessageHook(sessionId, remoteJid);

    return res.json({ success: true });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      error: error.message || "Erro ao enfileirar mensagem",
    });
  }
}

/*
 =========================
 ENVIAR CAMPANHA
 =========================
 */
export async function sendCampaign(req: Request, res: Response) {
  try {
    const sessionId = getTenantSessionId(req);
    if (!sessionId)
      return res.status(401).json({ success: false, error: "Sessão inválida" });

    const { groups, message } = req.body;
    const image = req.file;

    if (!groups || !message) {
      return res.status(400).json({
        success: false,
        error: "Selecione grupos e uma mensagem válidos.",
      });
    }

    const totalEnfileirado = await whatsappService.sendGroupCampaign(
      sessionId,
      groups,
      message,
      image?.path,
    );

    return res.json({
      success: true,
      totalGroups: totalEnfileirado,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      error: error.message || "Erro ao processar campanha",
    });
  }
}
