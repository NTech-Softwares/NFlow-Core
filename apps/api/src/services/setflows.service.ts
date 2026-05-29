import * as fs from "fs";
import * as path from "path";
import {
  getFlows,
  updateRegistry,
} from "../../../../providers/whatsapp/baileys/engine/flowRegistry";
import {
  Flow,
  FlowOption,
} from "../../../../providers/whatsapp/baileys/flows/types/flowTypes";

// Caminho absoluto para o arquivo oficial de dados que serve de persistência/backup local
const caminhoBackupJson = path.resolve(
  __dirname,
  "../../../../providers/whatsapp/baileys/flows/data/flows.json",
);

/* =========================================================================
   GERENCIAMENTO DE FLUXOS (FLOWS)
   ========================================================================= */

/**
 * Cria um novo fluxo de automação, injeta seu passo inicial com mensagem e o armazena.
 * A alteração é aplicada imediatamente em memória RAM e persistida no arquivo físico.
 * * @param flowId - Identificador exclusivo do fluxo (ex: 'suporte', 'vendas').
 * @param initialStep - O nome do estágio inicial do fluxo (padrão: "inicio").
 * @param stepMessage - O menu de opções ou texto explicativo pertencente ao passo inicial.
 * @returns Retorna o objeto do fluxo recém-criado em conformidade com a interface Flow.
 */
export async function addFlowJson(
  flowId: string,
  initialStep?: string,
  stepMessage?: string,
): Promise<Flow> {
  try {
    if (!flowId) {
      throw new Error("O ID do fluxo é obrigatório.");
    }

    const stepNome = initialStep || "inicio";
    const registroAtual = getFlows();

    if (registroAtual[flowId]) {
      throw new Error(`Um fluxo com o ID '${flowId}' já existe.`);
    }

    // 1. Clona profundamente o estado atual para mutação segura
    const todosOsFlowsClone = structuredClone(registroAtual);

    // 2. Monta a nova estrutura do fluxo
    const newFlow: Flow = {
      id: flowId,
      initialStep: stepNome,
      steps: {
        [stepNome]: {
          id: stepNome,
          message: stepMessage ? stepMessage.split("\n") : [""],
          options: [
            {
              key: "0",
              back: true,
            },
          ],
        },
      },
    };

    todosOsFlowsClone[flowId] = newFlow;

    // 3. Sincroniza a memória RAM e persiste no disco
    updateRegistry(todosOsFlowsClone);
    fs.writeFileSync(
      caminhoBackupJson,
      JSON.stringify(todosOsFlowsClone, null, 2),
      "utf8",
    );

    return newFlow;
  } catch (error: any) {
    throw new Error(`[addFlowJson] Falha na operação: ${error.message}`);
  }
}

/**
 * Remove permanentemente um fluxo de automação do ecossistema.
 */
export async function removeFlowJson(flowId: string): Promise<void> {
  try {
    if (!flowId) {
      throw new Error("O ID do fluxo é obrigatório.");
    }

    const registroAtual = getFlows();

    if (!registroAtual[flowId]) {
      throw new Error(`O fluxo com o ID '${flowId}' não existe.`);
    }

    // 1. Clona profundamente o estado atual para mutação segura
    const todosOsFlowsClone = structuredClone(registroAtual);

    delete todosOsFlowsClone[flowId];

    // 2. Sincroniza a memória RAM e persiste no disco
    updateRegistry(todosOsFlowsClone);
    fs.writeFileSync(
      caminhoBackupJson,
      JSON.stringify(todosOsFlowsClone, null, 2),
      "utf8",
    );
  } catch (error: any) {
    throw new Error(`[removeFlowJson] Falha na operação: ${error.message}`);
  }
}

/* =========================================================================
   GERENCIAMENTO DE PASSOS (STEPS)
   ========================================================================= */

/**
 * Adiciona um novo step (estágio) dentro de um fluxo existente.
 * * @param flowId - ID do fluxo onde o passo será alocado.
 * @param stepId - ID/Nome exclusivo do novo passo (ex: 'financeiro_menu').
 * @param stepMessage - Mensagem de texto inicial do passo.
 */
export async function addStepJson(
  flowId: string,
  stepId: string,
  stepMessage?: string,
): Promise<void> {
  try {
    if (!flowId || !stepId) {
      throw new Error("ID do fluxo e ID do novo step são obrigatórios.");
    }

    const registroAtual = getFlows();

    if (!registroAtual[flowId]) {
      throw new Error(`O fluxo com o ID '${flowId}' não existe.`);
    }

    if (registroAtual[flowId].steps && registroAtual[flowId].steps[stepId]) {
      throw new Error(
        `O step '${stepId}' já existe dentro do fluxo '${flowId}'.`,
      );
    }

    // 1. Clona profundamente o estado atual para mutação segura
    const todosOsFlowsClone = structuredClone(registroAtual);

    // 2. Garante que o mapa de steps exista
    if (!todosOsFlowsClone[flowId].steps) {
      todosOsFlowsClone[flowId].steps = {};
    }

    // 3. Insere a estrutura do novo Step com a opção padrão de voltar (key 0)
    todosOsFlowsClone[flowId].steps[stepId] = {
      id: stepId,
      message: stepMessage ? stepMessage.split("\n") : [""],
      options: [
        {
          key: "0",
          back: true,
        },
      ],
    };

    // 4. Sincroniza a memória RAM e persiste no disco
    updateRegistry(todosOsFlowsClone);
    fs.writeFileSync(
      caminhoBackupJson,
      JSON.stringify(todosOsFlowsClone, null, 2),
      "utf8",
    );
  } catch (error: any) {
    throw new Error(`[addStepJson] Falha na operação: ${error.message}`);
  }
}

/**
 * Remove um step específico de dentro de um fluxo existente.
 * Impedirá a remoção se o step for o passo inicial definido do fluxo.
 */
export async function removeStepJson(
  flowId: string,
  stepId: string,
): Promise<void> {
  try {
    if (!flowId || !stepId) {
      throw new Error("ID do fluxo e ID do step são obrigatórios.");
    }

    const registroAtual = getFlows();

    if (!registroAtual[flowId]) {
      throw new Error(`O fluxo com o ID '${flowId}' não existe.`);
    }

    if (!registroAtual[flowId].steps || !registroAtual[flowId].steps[stepId]) {
      throw new Error(`O step '${stepId}' não existe no fluxo '${flowId}'.`);
    }

    // [REGRA DE NEGÓCIO] Impede que o usuário delete o ponto de entrada principal do fluxo
    if (registroAtual[flowId].initialStep === stepId) {
      throw new Error(
        `Não é possível deletar o step '${stepId}' porque ele é o estágio inicial do fluxo.`,
      );
    }

    // 1. Clona profundamente o estado atual para mutação segura
    const todosOsFlowsClone = structuredClone(registroAtual);

    delete todosOsFlowsClone[flowId].steps[stepId];

    // 2. Sincroniza a memória RAM e persiste no disco
    updateRegistry(todosOsFlowsClone);
    fs.writeFileSync(
      caminhoBackupJson,
      JSON.stringify(todosOsFlowsClone, null, 2),
      "utf8",
    );
  } catch (error: any) {
    throw new Error(`[removeStepJson] Falha na operação: ${error.message}`);
  }
}

/* =========================================================================
   ATUALIZAÇÃO DE CONTEÚDO (MESSAGES & OPTIONS)
   ========================================================================= */

/**
 * Atualiza a mensagem de um step específico dentro de um fluxo existente.
 */
export async function updateStepMessageJson(
  flowId: string,
  stepId: string,
  newMessage: string,
): Promise<void> {
  try {
    if (!flowId || !stepId) {
      throw new Error("ID do fluxo e ID do step são obrigatórios.");
    }

    const registroAtual = getFlows();

    if (!registroAtual[flowId]) {
      throw new Error(`O fluxo com o ID '${flowId}' não existe.`);
    }

    if (!registroAtual[flowId].steps || !registroAtual[flowId].steps[stepId]) {
      throw new Error(`O step '${stepId}' não existe no fluxo '${flowId}'.`);
    }

    const todosOsFlowsClone = structuredClone(registroAtual);
    const messageArray =
      typeof newMessage === "string" ? newMessage.split("\n") : [""];

    todosOsFlowsClone[flowId].steps[stepId].message = messageArray;

    updateRegistry(todosOsFlowsClone);
    fs.writeFileSync(
      caminhoBackupJson,
      JSON.stringify(todosOsFlowsClone, null, 2),
      "utf8",
    );
  } catch (error: any) {
    throw new Error(
      `[updateStepMessageJson] Falha na operação: ${error.message}`,
    );
  }
}

/**
 * Atualiza as opções (direcionamentos de botões) de um step específico.
 */
export async function updateStepOptionsJson(
  flowId: string,
  stepId: string,
  newOptions: FlowOption[],
): Promise<void> {
  try {
    if (!flowId || !stepId) {
      throw new Error("ID do fluxo e ID do step são obrigatórios.");
    }

    const registroAtual = getFlows();

    if (!registroAtual[flowId]) {
      throw new Error(`O fluxo com o ID '${flowId}' não existe.`);
    }

    if (!registroAtual[flowId].steps || !registroAtual[flowId].steps[stepId]) {
      throw new Error(`O step '${stepId}' não existe no fluxo '${flowId}'.`);
    }

    const todosOsFlowsClone = structuredClone(registroAtual);

    todosOsFlowsClone[flowId].steps[stepId].options = newOptions;

    updateRegistry(todosOsFlowsClone);
    fs.writeFileSync(
      caminhoBackupJson,
      JSON.stringify(todosOsFlowsClone, null, 2),
      "utf8",
    );
  } catch (error: any) {
    throw new Error(
      `[updateStepOptionsJson] Falha na operação: ${error.message}`,
    );
  }
}
