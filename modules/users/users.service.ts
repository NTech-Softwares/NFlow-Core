import fs from "fs";
import path from "path";
import { logger } from "../../shared/utils/logger";
import { DEFAULT_FLOW_TEMPLATE } from "../../providers/whatsapp/baileys/engine/flowRegistry";

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

      // Cria a pasta física do cliente se não existir
      if (!fs.existsSync(sessionFolder)) {
        fs.mkdirSync(sessionFolder, { recursive: true });
      }

      // Grava o fluxo padrão limpo
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
      // Não damos throw para não travar o cadastro do usuário caso dê algum erro de permissão de disco
    }
  }
}
