import { logger } from "../../shared/utils/logger";
import {
  DEFAULT_FLOW_TEMPLATE,
  saveFlowsForSession,
} from "../flows/repository/flow.registry";
import { BusinessHoursConfig } from "../../shared/utils/businessHours";
import * as userRepository from "./users.repository";

export class UserService {
  /**
   * 🚀 CORRIGIDO: Agora aceita o whatsappSessionId real (sess_UUID) vindo do fluxo de autenticação
   */
  async provisionNewTenantSpace(
    id: string,
    whatsappSessionId: string,
  ): Promise<void> {
    try {
      // Grava na tabela chamando a PK correta que o Baileys/Chat vai buscar
      await saveFlowsForSession(whatsappSessionId, id, DEFAULT_FLOW_TEMPLATE);
      logger.info(
        `[Provisionamento] Fluxos iniciais criados no Postgres para a Sessão: ${whatsappSessionId}`,
      );
    } catch (error: any) {
      logger.error(
        `[Provisionamento] Falha para o tenant [${id}]: ${error.message}`,
      );
    }
  }

  /**
   * 🎯 Busca dados seguros e públicos do perfil do usuário
   */
  async getUserProfile(userId: string) {
    const users = await userRepository.getUsers();
    const user = users.find((u) => u.id === userId);

    if (!user) {
      throw new Error("Usuário não encontrado.");
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      businessHours: user.businessHours || {
        enabled: false,
        timezone: "America/Sao_Paulo",
        schedule: {
          "0": [],
          "1": [],
          "2": [],
          "3": [],
          "4": [],
          "5": [],
          "6": [],
        },
        awayMessage: ["⚠️ No momento estamos fora do horário de atendimento."],
      },
    };
  }

  /**
   * 🎯 Atualiza as configurações de horário de funcionamento do usuário
   */
  async updateBusinessHours(
    userId: string,
    businessHours: BusinessHoursConfig,
  ) {
    const updatedUser = await userRepository.updateUserProfile(userId, {
      businessHours,
    });

    if (!updatedUser) {
      throw new Error("Falha ao atualizar perfil. Usuário não encontrado.");
    }

    return updatedUser.businessHours;
  }
}
