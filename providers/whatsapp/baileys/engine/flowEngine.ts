import { getFlows } from "./flowRegistry";
import { getSession } from "../state/sessionStore";

/**
 * Processa a mensagem enviada pelo usuário, gerencia o estado da conversa e determina a próxima resposta.
 * * @param user - Identificador único do usuário (geralmente o número do WhatsApp).
 * @param content - O texto exato da mensagem enviada pelo usuário.
 * @returns Um objeto contendo a lista de mensagens de resposta a serem enviadas.
 */
export async function processFlow(user: string, content: string) {
  // 1. Recupera ou cria a sessão atual do usuário na memória RAM
  const session = getSession(user);

  // Normaliza o texto para evitar problemas com espaços extras ou letras maiúsculas
  const normalized = content.trim().toLowerCase();

  // 2. Carrega os fluxos ativos da memória e localiza onde o usuário está posicionado
  const flows = getFlows();
  const currentFlow = flows[session.currentFlow];

  // [SEGURANÇA] Se o fluxo da sessão não existir no sistema, corta o processo aqui
  if (!currentFlow) {
    return { messages: ["❌ Fluxo não encontrado."] };
  }

  // Localiza o passo (step) exato em que o usuário parou
  const currentStep = currentFlow.steps[session.currentStep];

  // [SEGURANÇA] Se o passo atual sumiu ou foi renomeado, corta o processo aqui
  if (!currentStep) {
    return { messages: ["❌ Step não encontrado."] };
  }

  /*
   =========================================================
   INTERCEPTADORES DE COMANDOS GLOBAIS
   =========================================================
   Definição de palavras-chave que funcionam em qualquer lugar do bot.
  */
  const globalCommands: Record<string, () => { messages: string[] }> = {
    // Retorna o usuário para o passo inicial do fluxo em que ele já se encontra
    voltar: () => {
      session.currentStep = currentFlow.initialStep;
      const step = currentFlow.steps[session.currentStep];
      return { messages: step.message };
    },

    // Reseta completamente a jornada e joga o usuário para o menu principal limpo
    menu: () => {
      session.currentFlow = "main";
      session.currentStep = "menu";
      session.stack = []; // Limpa o histórico de navegação

      const flow = flows["main"];
      const step = flow.steps["menu"];
      return { messages: step.message };
    },

    // Reseta o estado (atualmente espelha o mesmo comportamento do menu principal)
    reset: () => {
      session.currentFlow = "main";
      session.currentStep = "menu";
      session.stack = [];

      const flow = flows["main"];
      const step = flow.steps["menu"];
      return { messages: step.message };
    },
  };

  // Se a mensagem digitada for exatamente um comando global, executa e responde imediatamente
  if (globalCommands[normalized]) {
    return globalCommands[normalized]();
  }

  /*
   =========================================================
   INTERCEPTADOR DE SAUDAÇÃO / PRIMEIRO CONTATO
   =========================================================
  */
  // Se o usuário mandar um "Oi" ou se for a primeiríssima mensagem dele no sistema
  if (
    ["oi", "ola", "olá", "hello", "tudo manero cumpade"].includes(normalized) ||
    !session.welcome
  ) {
    session.welcome = true; // Marca que o usuário já recebeu as boas-vindas

    // Apenas repete a mensagem do passo atual (geralmente o menu com as opções)
    return { messages: currentStep.message };
  }

  /*
   =========================================================
   PROCESSAMENTO DE OPÇÕES (MENU DINÂMICO)
   =========================================================
  */
  // Procura se o que o usuário digitou bate com a "key" de alguma opção do passo atual
  const option = currentStep.options?.find(
    (option) => option.key.toLowerCase() === normalized,
  );

  // Se o usuário digitou algo que não está nas opções do menu, devolve erro
  if (!option) {
    return { messages: ["❌ Opção inválida."] };
  }

  /*
   ---------------------------------------------------------
   TRANSIÇÕES DE ESTADO (Atualização da Sessão)
   ---------------------------------------------------------
   Se o código chegou aqui, a opção digitada é válida. Agora alteramos a sessão.
  */

  if (option.back) {
    // [VOLTAR] Retira o último estado salvo da pilha (histórico) e reposiciona o usuário lá
    const previous = session.stack.pop();
    if (previous) {
      session.currentFlow = previous.flow;
      session.currentStep = previous.step;
    }
  } else if (option.nextFlow) {
    // [MUDAR DE FLUXO] Salva a posição atual na pilha (histórico) antes de migrar
    session.stack.push({
      flow: session.currentFlow,
      step: session.currentStep,
    });

    // Atualiza a sessão para o novo fluxo e define o passo inicial dele
    session.currentFlow = option.nextFlow;
    session.currentStep = option.nextStep || flows[option.nextFlow].initialStep;
  } else if (option.goToStep) {
    // [DESVIO ESPECÍFICO] Força a sessão a ir direto para um passo específico do mesmo fluxo
    session.currentStep = option.goToStep;
  } else if (option.nextStep) {
    // [SEQUÊNCIA PADRÃO] Avança linearmente para o próximo passo definido na opção
    session.currentStep = option.nextStep;
  }

  /*
   =========================================================
   ENVIO DA RESPOSTA FINAL
   =========================================================
  */
  // Captura o fluxo e o passo atualizados (após a transição acima ter sido aplicada)
  const nextFlow = flows[session.currentFlow];
  const nextStep = nextFlow.steps[session.currentStep];

  // Devolve as mensagens do novo passo para o robô disparar no WhatsApp do cliente
  return {
    messages: nextStep.message,
  };
}
