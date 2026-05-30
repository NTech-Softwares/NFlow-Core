import fs from "fs";
import path from "path";
import { Flow } from "../domain/flow.types";
import { logger } from "../../../shared/utils/logger";

export const DEFAULT_FLOW_TEMPLATE: Record<string, Flow> = {
  main: {
    id: "main",
    name: "Menu Principal",
    initialStep: "menu",
    steps: {
      menu: {
        id: "menu",
        name: "Menu Inicial",
        message: [
          "👋 Olá! Seja bem-vindo(a) ao seu novo atendimento automático.",
          "",
          "Você ainda não configurou as opções deste menu.",
          "Crie fluxos de atendimento para o seu bot!",
        ],
        options: [
          {
            key: "0",
            back: true,
          },
        ],
      },
    },
  },
};

/**
 * Auxiliar para capturar o caminho absoluto do arquivo flows.json baseado no ID do Usuário
 * Aponta para a pasta central de storage na raiz do projeto
 */
function getFlowFilePath(id: string): string {
  return path.join(process.cwd(), "storage", "flows", id, "flows.json");
}

/**
 * Retorna o fluxo customizado de uma sessão específica baseada no ID do usuário
 */
export function getFlowsForSession(
  sessionId: string,
  id: string,
): Record<string, Flow> {
  const userFlowFile = getFlowFilePath(id);
  const userFolder = path.dirname(userFlowFile);

  try {
    // 🎯 Garante que a árvore de pastas no storage/flows/{id} exista
    if (!fs.existsSync(userFolder)) {
      fs.mkdirSync(userFolder, { recursive: true });
    }

    // 🎯 Se o usuário não tiver o arquivo, grava o template minimalista
    if (!fs.existsSync(userFlowFile)) {
      logger.info(
        `[Registry] Inicializando estrutura minimalista padrão no storage para o ID: ${id} (Sessão: ${sessionId})`,
      );

      fs.writeFileSync(
        userFlowFile,
        JSON.stringify(DEFAULT_FLOW_TEMPLATE, null, 2),
        "utf-8",
      );
    }

    const fileContent = fs.readFileSync(userFlowFile, "utf-8");
    return JSON.parse(fileContent) as Record<string, Flow>;
  } catch (error: any) {
    logger.error(
      `Erro ao carregar/criar fluxos para o ID [${id}] (Sessão: ${sessionId}): ${error.message}`,
    );
    return DEFAULT_FLOW_TEMPLATE;
  }
}

/**
 * Salva um novo fluxo customizado enviado pelo painel para um usuário específico
 */
export function saveFlowsForSession(
  sessionId: string,
  id: string,
  newFlows: Record<string, Flow>,
) {
  const userFlowFile = getFlowFilePath(id);
  const userFolder = path.dirname(userFlowFile);

  if (!fs.existsSync(userFolder)) {
    fs.mkdirSync(userFolder, { recursive: true });
  }

  fs.writeFileSync(userFlowFile, JSON.stringify(newFlows, null, 2), "utf-8");
  logger.info(
    `[Registry] Fluxos atualizados com sucesso no storage para o ID: ${id}`,
  );
}
