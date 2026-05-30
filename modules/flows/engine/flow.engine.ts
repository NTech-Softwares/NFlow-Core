import { getFlowsForSession } from "../repository/flow.registry";
import { getSession } from "../state/sessionStore";

/**
 * Processa a mensagem enviada pelo usuário, gerencia o estado da conversa e determina a próxima resposta.
 * @param remoteJid - Identificador único do lead (número do WhatsApp).
 * @param content - O texto exato da mensagem enviada pelo usuário.
 * @param sessionId - O ID do inquilino que possui essa conta de WhatsApp (Ex: suzana_session ou o id direto).
 */
export async function processFlow(
  remoteJid: string,
  content: string,
  sessionId: string,
) {
  // 1. Recupera ou cria a sessão atual do lead ISOLADA por Tenant
  const session = getSession(remoteJid, sessionId);

  // Normaliza o texto para evitar problemas com espaços extras ou letras maiúsculas
  const normalized = content.trim().toLowerCase();

  // 🎯 EXTRAÇÃO DO ID DO USUÁRIO: Captura a primeira parte antes do "_session"
  const userId = sessionId.includes("_session")
    ? sessionId.split("_session")[0]
    : sessionId;

  // 2. Carrega dinamicamente os fluxos exclusivos DESTE inquilino
  const flows = getFlowsForSession(sessionId, userId);
  const currentFlow = flows[session.currentFlow];

  // [SEGURANÇA] Se o fluxo da sessão não existir no sistema do cliente, corta o processo aqui
  if (!currentFlow) {
    return {
      messages: [
        "❌ Fluxo não encontrado ou ainda não configurado para esta conta.",
      ],
    };
  }

  // Localiza o passo (step) exato em que o usuário parou
  const currentStep = currentFlow.steps[session.currentStep];

  // [SEGURANÇA] Se o passo atual sumiu ou foi renomeado, corta o processo aqui
  if (!currentStep) {
    return { messages: ["❌ Etapa não encontrada no fluxo ativo."] };
  }

  /*
   =========================================================
   INTERCEPTADORES DE COMANDOS GLOBAIS
   =========================================================
  */
  const globalCommands: Record<string, () => { messages: string[] }> = {
    voltar: () => {
      session.currentStep = currentFlow.initialStep;
      const step = currentFlow.steps[session.currentStep];
      return { messages: step.message };
    },

    menu: () => {
      session.currentFlow = "main";
      session.currentStep = "menu";
      session.stack = []; // Limpa o histórico de navegação

      const flow = flows["main"];
      const step = flow?.steps["menu"];
      return step
        ? { messages: step.message }
        : { messages: ["❌ Menu não configurado."] };
    },

    reset: () => {
      session.currentFlow = "main";
      session.currentStep = "menu";
      session.stack = [];

      const flow = flows["main"];
      const step = flow?.steps["menu"];
      return step
        ? { messages: step.message }
        : { messages: ["❌ Menu não configurado."] };
    },
  };

  if (globalCommands[normalized]) {
    return globalCommands[normalized]();
  }

  /*
   =========================================================
   INTERCEPTADOR DE SAUDAÇÃO / PRIMEIRO CONTATO
   =========================================================
  */
  if (
    ["oi", "ola", "olá", "hello", "tudo manero cumpade"].includes(normalized) ||
    !session.welcome
  ) {
    session.welcome = true;
    return { messages: currentStep.message };
  }

  /*
   =========================================================
   PROCESSAMENTO DE OPÇÕES (MENU DINÂMICO)
   =========================================================
  */
  const option = currentStep.options?.find(
    (option) => option.key.toLowerCase() === normalized,
  );

  if (!option) {
    return {
      messages: [
        "❌ Opção inválida. Escolha uma das opções válidas informadas no menu acima.",
      ],
    };
  }

  /*
   ---------------------------------------------------------
   TRANSIÇÕES DE ESTADO (Atualização da Sessão)
   ---------------------------------------------------------
  */
  if (option.back) {
    const previous = session.stack.pop();
    if (previous) {
      session.currentFlow = previous.flow;
      session.currentStep = previous.step;
    }
  } else if (option.nextFlow) {
    session.stack.push({
      flow: session.currentFlow,
      step: session.currentStep,
    });

    session.currentFlow = option.nextFlow;
    session.currentStep = option.nextStep || flows[option.nextFlow].initialStep;
  } else if (option.goToStep) {
    session.currentStep = option.goToStep;
  } else if (option.nextStep) {
    session.currentStep = option.nextStep;
  }

  /*
   =========================================================
   ENVIO DA RESPOSTA FINAL
   =========================================================
  */
  const nextFlow = flows[session.currentFlow];
  const nextStep = nextFlow?.steps[session.currentStep];

  if (!nextStep) {
    return { messages: ["❌ Próxima etapa do fluxo não encontrada."] };
  }

  return {
    messages: nextStep.message,
  };
}
