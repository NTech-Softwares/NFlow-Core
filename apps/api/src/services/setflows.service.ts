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

/**
 * Cria um novo fluxo de automação, injeta seu passo inicial com mensagem e o armazena.
 * A alteração é aplicada imediatamente em memória RAM e persistida no arquivo físico.
 * * @param flowId - Identificador exclusivo do fluxo (ex: 'suporte', 'vendas').
 * @param initialStep - O nome do estágio inicial do fluxo (padrão: "inicio").
 * @param stepMessage - O menu de opções ou texto explicativo pertencente ao passo inicial.
 * @returns Retorna o objeto do fluxo recém-criado em conformidade com a interface Flow.
 * @throws {Error} Caso o flowId seja omitido, o fluxo já exista ou ocorra falha de I/O no disco.
 */
export async function addFlowJson(
  flowId: string,
  initialStep?: string,
  stepMessage?: string,
): Promise<Flow> {
  try {
    // [VALIDAÇÃO] Garante que o identificador do fluxo foi fornecido
    if (!flowId) {
      throw new Error("O ID do fluxo é obrigatório.");
    }

    // Define o nome do passo inicial utilizando o fallback padrão caso não seja enviado
    const stepNome = initialStep || "inicio";

    // 1. Captura o estado atual de todos os fluxos ativos direto da MEMÓRIA RAM
    const todosOsFlows = { ...getFlows() };

    // [VALIDAÇÃO] Impede a criação de fluxos duplicados com o mesmo ID
    if (todosOsFlows[flowId]) {
      throw new Error(`Um fluxo com o ID '${flowId}' já existe.`);
    }

    // 2. Monta a nova estrutura do fluxo com as saudações e o passo inicial parametrizados
    const newFlow: Flow = {
      id: flowId,
      initialStep: stepNome,
      steps: {
        [stepNome]: {
          id: stepNome,
          message: [stepMessage || ""],
          options: [
            {
              key: "0",
              back: true,
            },
          ], // Inicializa vazio para ser populado posteriormente via painel (opção 0 é padrão)
        },
      },
    };

    // 3. Insere o novo objeto mapeando-o diretamente sob a chave do flowId
    todosOsFlows[flowId] = newFlow;

    // 4. Sincroniza a MEMÓRIA RAM para que o motor do chatbot e o painel operem as mudanças em tempo real
    updateRegistry(todosOsFlows);

    // 5. Registra de forma síncrona o backup físico formatado no disco (persistência)
    fs.writeFileSync(
      caminhoBackupJson,
      JSON.stringify(todosOsFlows, null, 2),
      "utf8",
    );

    return newFlow;
  } catch (error: any) {
    throw new Error(`[addFlowJson] Falha na operação: ${error.message}`);
  }
}

/**
 * Remove permanentemente um fluxo de automação do ecossistema.
 * A remoção limpa o registro em memória viva e atualiza o arquivo de persistência física.
 * * @param flowId - Identificador exclusivo do fluxo que será deletado.
 * @throws {Error} Caso o flowId seja omitido, o fluxo não seja localizado ou ocorra erro de escrita.
 */
export async function removeFlowJson(flowId: string): Promise<void> {
  try {
    // [VALIDAÇÃO] Garante que o identificador do fluxo foi fornecido
    if (!flowId) {
      throw new Error("O ID do fluxo é obrigatório.");
    }

    // 1. Captura o estado atual de todos os fluxos ativos direto da MEMÓRIA RAM
    const todosOsFlows = { ...getFlows() };

    // [VALIDAÇÃO] Certifica que o fluxo de fato existe antes de iniciar a deleção
    if (!todosOsFlows[flowId]) {
      throw new Error(`O fluxo com o ID '${flowId}' não existe.`);
    }

    // 2. Remove a propriedade correspondente ao fluxo de dentro do mapa de objetos
    delete todosOsFlows[flowId];

    // 3. Sincroniza a MEMÓRIA RAM (O motor do WhatsApp desvincula o fluxo instantaneamente)
    updateRegistry(todosOsFlows);

    // 4. Reescreve o arquivo de persistência física no disco com os dados atualizados
    fs.writeFileSync(
      caminhoBackupJson,
      JSON.stringify(todosOsFlows, null, 2),
      "utf8",
    );
  } catch (error: any) {
    throw new Error(`[removeFlowJson] Falha na operação: ${error.message}`);
  }
}

/**
 * Atualiza a mensagem de um step específico dentro de um fluxo existente.
 * Sincroniza em tempo real na memória RAM e persiste no disco.
 * * @param flowId - ID do fluxo onde o passo está alocado.
 * @param stepId - ID do passo que terá a mensagem modificada.
 * @param newMessage - O novo texto da mensagem (enviado com \n do textarea).
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

    // 1. Captura o estado atual de todos os fluxos ativos direto da MEMÓRIA RAM
    const todosOsFlows = { ...getFlows() };

    // [VALIDAÇÃO] Certifica que o fluxo existe
    if (!todosOsFlows[flowId]) {
      throw new Error(`O fluxo com o ID '${flowId}' não existe.`);
    }

    // [VALIDAÇÃO] Certifica que o step existe dentro desse fluxo
    if (!todosOsFlows[flowId].steps || !todosOsFlows[flowId].steps[stepId]) {
      throw new Error(`O step '${stepId}' não existe no fluxo '${flowId}'.`);
    }

    // 2. Trata a mensagem: divide de volta em um array de linhas caso contenha quebras de linha
    // Isso preserva o formato original do seu JSON.
    const messageArray =
      typeof newMessage === "string" ? newMessage.split("\n") : [""];

    // 3. Atualiza o objeto específico na estrutura
    todosOsFlows[flowId].steps[stepId].message = messageArray;

    // 4. Sincroniza a MEMÓRIA RAM para efeito imediato no robô
    updateRegistry(todosOsFlows);

    // 5. Registra de forma síncrona o backup físico formatado no disco
    fs.writeFileSync(
      caminhoBackupJson,
      JSON.stringify(todosOsFlows, null, 2),
      "utf8",
    );
  } catch (error: any) {
    throw new Error(
      `[updateStepMessageJson] Falha na operação: ${error.message}`,
    );
  }
}

/**
 * Atualiza as opções (direcionamentos de botões) de um step específico dentro de um fluxo existente.
 * Sincroniza em tempo real na memória RAM e persiste no disco.
 * * @param flowId - ID do fluxo onde o passo está alocado.
 * @param stepId - ID do passo que terá as opções modificadas.
 * @param newOptions - O novo array de opções/direcionamentos do step.
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

    // 1. Obtém o registro atual
    const registroAtual = getFlows();

    // [VALIDAÇÃO] Certifica que o fluxo existe
    if (!registroAtual[flowId]) {
      throw new Error(`O fluxo com o ID '${flowId}' não existe.`);
    }

    // [VALIDAÇÃO] Certifica que o step existe dentro desse fluxo
    if (!registroAtual[flowId].steps || !registroAtual[flowId].steps[stepId]) {
      throw new Error(`O step '${stepId}' não existe no fluxo '${flowId}'.`);
    }

    // 2. Clona PROFUNDAMENTE o estado para evitar mutação precoce na memória RAM
    const todosOsFlowsClone = structuredClone(registroAtual);

    // 3. Atualiza com segurança o objeto clonado
    todosOsFlowsClone[flowId].steps[stepId].options = newOptions;

    // 4. Sincroniza a MEMÓRIA RAM para efeito imediato no robô através do Registry
    updateRegistry(todosOsFlowsClone);

    // 5. Registra de forma síncrona o backup físico formatado no disco
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
