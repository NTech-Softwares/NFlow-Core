import {
  BusinessHoursConfig,
  formatBusinessHours,
  isInsideBusinessHours,
} from "../../../shared/utils/businessHours";
import { handleCustomServicesFlow } from "../../customServices/engine/customServices.flow";
import { getBusinessHoursByUserId } from "../../users/users.repository";
import { getFlowsForSession } from "../repository/flow.registry";
import { getSession, saveSession } from "../state/sessionStore";

// 1. DEFINIÇÃO DA INTERFACE DOS COMANDOS GLOBAIS
interface GlobalCommandResult {
  messages: string[];
}

// 2. FÁBRICA DE COMANDOS GLOBAIS
function getGlobalCommands(context: {
  session: any;
  flows: any;
  currentFlow: any;
  businessHours?: BusinessHoursConfig;
}) {
  const { session, flows, currentFlow, businessHours } = context;

  const commands: Record<string, () => GlobalCommandResult> = {
    initialStep: () => {
      session.currentStep = currentFlow.initialStep;
      const step = currentFlow.steps[session.currentStep];
      return { messages: step.message };
    },

    voltar: () => {
      const previous = session.stack.pop();
      if (previous) {
        session.currentFlow = previous.flow;
        session.currentStep = previous.step;
      } else {
        session.currentFlow = "main";
        session.currentStep = "menu";
      }

      const flow = flows[session.currentFlow];
      const step = flow?.steps[session.currentStep];
      return step
        ? { messages: step.message }
        : { messages: ["❌ Etapa não encontrada."] };
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

    horario: () => {
      return {
        messages: formatBusinessHours(businessHours!),
      };
    },

    atendente: () => {
      if (businessHours && !isInsideBusinessHours(businessHours)) {
        return {
          messages: businessHours.awayMessage || [
            "⚠️ No momento estamos fora do horário de atendimento.",
          ],
        };
      }

      session.atendimento = "em_espera";
      session.updatedAt = new Date();

      return {
        messages: [
          "Aguarde um momento, nosso time de atendimento já foi notificado e logo você será atendido! ⏳",
        ],
      };
    },

    autoAtendimento: () => {
      session.atendimento = "automatico";
      session.currentFlow = "main";
      session.currentStep = "menu";
      session.welcome = false;
      return {
        messages: [
          "Atendimento encerrado. O Menu Automático foi reativado! 🤖",
        ],
      };
    },

    "0": () => commands.reset(),
    atendimento: () => commands.atendente(),
    encerrar: () => commands.autoAtendimento(),
  };

  return commands;
}

/**
 * Processa a mensagem enviada, gerencia o estado da conversa e determina a próxima resposta.
 */
export async function processFlow(
  remoteJid: string,
  content: string,
  sessionId: string,
  pushName?: string,
  fromMe: boolean = false,
  messageId?: string,
) {
  const session = await getSession(remoteJid, sessionId);

  /*
   =========================================================
    INTERCEPTADOR DE MENSAGENS DO OPERADOR (FROM ME)
   =========================================================
  */
  if (fromMe) {
    if (!session.botMessageIds) session.botMessageIds = [];

    const isBotMessage = session.botMessageIds.includes(messageId);

    if (isBotMessage) {
      session.botMessageIds = session.botMessageIds.filter(
        (id: string) => id !== messageId,
      );
    } else if (session.atendimento === "em_espera") {
      session.atendimento = "em_atendimento";
      session.lastMessage = content;
      session.updatedAt = new Date();
    }

    // 🔥 Salva o estado modificado no banco antes de interromper
    await saveSession(remoteJid, sessionId, session);
    return { messages: [] };
  }

  // ATUALIZAÇÃO DE METADADOS
  if (pushName) session.pushName = pushName;
  session.lastMessage = content;
  session.updatedAt = new Date();

  const normalized = content
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  const userId = sessionId.includes("_session")
    ? sessionId.split("_session")[0]
    : sessionId;

  // INTERCEPTADOR DO MÓDULO CUSTOM SERVICES
  const customServicesResult = await handleCustomServicesFlow(
    remoteJid,
    content,
    sessionId,
    userId,
    normalized,
    session,
  );

  if (customServicesResult) {
    // 🔥 Salva o estado modificado gerado pelo serviço customizado
    await saveSession(remoteJid, sessionId, session);
    return customServicesResult;
  }

  const businessHours = await getBusinessHoursByUserId(userId);

  // 🔥 Ajustado para usar AWAIT: Busca a árvore de fluxos registrada no banco de dados
  const flows = await getFlowsForSession(sessionId, userId);
  const currentFlow = flows[session.currentFlow];

  if (!currentFlow) {
    return {
      messages: [
        "❌ Fluxo não encontrado ou ainda não configurado para esta conta.",
      ],
    };
  }

  const currentStep = currentFlow.steps[session.currentStep];

  if (!currentStep) {
    return { messages: ["❌ Etapa não encontrada no fluxo ativo."] };
  }

  const globalCommands = getGlobalCommands({
    session,
    flows,
    currentFlow,
    businessHours,
  });

  /*
   =========================================================
    VERIFICAÇÃO DO STATUS DE ATENDIMENTO HUMANO
   =========================================================
  */
  if (session.atendimento !== "automatico") {
    if (normalized === "encerrar" || normalized === "autoatendimento") {
      const result = globalCommands[normalized]();
      await saveSession(remoteJid, sessionId, session);
      return result;
    }

    await saveSession(remoteJid, sessionId, session);
    return { messages: [] };
  }

  if (globalCommands[normalized]) {
    const result = globalCommands[normalized]();
    await saveSession(remoteJid, sessionId, session);
    return result;
  }

  /*
   =========================================================
   INTERCEPTADOR DE SAUDAÇÃO / PRIMEIRO CONTATO
   =========================================================
  */
  if (
    ["oi", "ola", "hello", "tudo manero cumpade"].includes(normalized) ||
    !session.welcome
  ) {
    session.welcome = true;
    await saveSession(remoteJid, sessionId, session);
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
    const stepOptions = currentStep.options || [];

    const isFreeTextStep =
      stepOptions.length === 0 ||
      (stepOptions.length === 1 && stepOptions[0].key === "0");

    if (isFreeTextStep) {
      await saveSession(remoteJid, sessionId, session);
      return { messages: [] };
    }

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
    } else {
      session.currentFlow = "main";
      session.currentStep = "menu";
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

  // Grava definitivamente todas as transições de estado calculadas no banco de dados
  await saveSession(remoteJid, sessionId, session);

  return {
    messages: nextStep.message,
  };
}
