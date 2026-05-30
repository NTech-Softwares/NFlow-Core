import { IWhatsappService, WhatsappStatusResponse } from "./whatsapp.interface";
import {
  startWhatsapp,
  getSessionStatus,
  getWhatsapp,
} from "../../../../providers/whatsapp/baileys/client";
import { getGroups } from "../../../../providers/whatsapp/baileys/services/groups.service";
import { messageQueue } from "../../../../shared/queue/messageQueue";
import { getUsers } from "../../../../modules/users/users.repository";
import { logger } from "../../../../shared/utils/logger";

export class WhatsappService implements IWhatsappService {
  /**
   * Obtém o status da sessão em tempo real e inicia se estiver offline
   */
  async getStatus(sessionId: string): Promise<WhatsappStatusResponse> {
    const sessionData = await getSessionStatus(sessionId);

    // 🎯 Se a sessão está desconectada (novo usuário ou derrubada), dá o start sob demanda
    if (!sessionData || sessionData.status === "DISCONNECTED") {
      logger.info(
        `[WhatsApp Service] Iniciando Baileys sob demanda para a sessão: ${sessionId}`,
      );

      // Inicializa em background para não travar a requisição HTTP do usuário
      startWhatsapp(sessionId).catch((err) => {
        logger.error(
          `[WhatsApp Service] Erro ao iniciar sessão sob demanda para [${sessionId}]:`,
          err,
        );
      });

      // Retorna um status temporário para o front saber que está inicializando o processo
      return { success: true, status: "INITIALIZING", qr: null };
    }

    return sessionData;
  }

  /**
   * Lista os grupos vinculados à sessão do cliente
   */
  async listGroups(sessionId: string): Promise<any[]> {
    // Garante que o socket está ativo antes de tentar ler os grupos
    getWhatsapp(sessionId);

    // Passando o sessionId adiante para o arquivo de serviço interno do Baileys
    const grupos = await getGroups(sessionId);
    return grupos || [];
  }

  /**
   * Adiciona uma mensagem individual na fila do worker
   */
  async sendIndividualMessage(
    sessionId: string,
    number: string,
    text: string,
    imagePath?: string,
  ): Promise<void> {
    const formattedNumber = number.replace(/\D/g, "");

    if (formattedNumber.length < 12) {
      throw new Error("Formato de número inválido para o WhatsApp.");
    }

    // Passamos o sessionId dentro do payload da fila para o Worker saber por qual canal disparar
    messageQueue.push({
      sessionId,
      jid: `${formattedNumber}@s.whatsapp.net`,
      imagePath,
      message: { text },
    });

    logger.info(
      `[Sessão: ${sessionId}] Mensagem adicionada na fila -> ${formattedNumber}`,
    );
  }

  /**
   * Adiciona disparos em massa para grupos na fila do worker
   */
  async sendGroupCampaign(
    sessionId: string,
    groups: string | string[],
    text: string,
    imagePath?: string,
  ): Promise<number> {
    const groupList = typeof groups === "string" ? [groups] : groups;

    if (!groupList.length) {
      throw new Error("Nenhum grupo válido foi selecionado para a campanha.");
    }

    groupList.forEach((groupId) => {
      messageQueue.push({
        sessionId,
        jid: groupId,
        imagePath,
        message: { text },
      });
    });

    logger.info(
      `[Sessão: ${sessionId}] ${groupList.length} mensagens de campanha inseridas na fila.`,
    );
    return groupList.length;
  }

  /**
   * Inicializa de forma assíncrona todas as sessões salvas no JSON (Auto-boot do Servidor)
   */
  async initAllSavedSessions(): Promise<void> {
    try {
      const users = await getUsers();
      logger.info(
        `[Auto-Boot] Inicializando sessões de ${users.length} clientes cadastrados...`,
      );

      for (const user of users) {
        if (user.whatsappSessionId) {
          // Inicializa em background para uma falha de QR de um cliente não parar a API inteira
          startWhatsapp(user.whatsappSessionId).catch((err) => {
            logger.error(
              `[Auto-Boot] Falha ao iniciar sessão para ${user.name}:`,
              err,
            );
          });
        }
      }
    } catch (error: any) {
      logger.error(
        `[Auto-Boot] Erro crítico ao ler sessões de usuários: ${error.message}`,
      );
    }
  }
}
