import fs from "fs";
import path from "path";
import { logger } from "../../shared/utils/logger";
import { DEFAULT_FLOW_TEMPLATE } from "../flows/repository/flow.registry";
import { BusinessHoursConfig } from "../../shared/utils/businessHours";
import * as userRepository from "./users.repository";

export class UserService {
  /**
   * Provisiona a estrutura inicial de arquivos para um novo usuário cadastrado
   */
  async provisionNewTenantSpace(id: string): Promise<void> {
    try {
      const sessionFolder = path.join(
        process.cwd(),
        "providers",
        "whatsapp",
        "baileys",
        "flows",
        "data",
        id,
      );
      const userFlowFile = path.join(sessionFolder, "flows.json");

      if (!fs.existsSync(sessionFolder)) {
        fs.mkdirSync(sessionFolder, { recursive: true });
      }

      if (!fs.existsSync(userFlowFile)) {
        fs.writeFileSync(
          userFlowFile,
          JSON.stringify(DEFAULT_FLOW_TEMPLATE, null, 2),
          "utf-8",
        );
        logger.info(
          `[Provisionamento] Espaço de fluxos criado com sucesso para o novo inquilino: ${id}`,
        );
      }
    } catch (error: any) {
      logger.error(
        `[Provisionamento] Falha ao criar espaço físico para o tenant [${id}]: ${error.message}`,
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
