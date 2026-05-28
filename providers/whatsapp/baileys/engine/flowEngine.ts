import { getFlows } from "./flowRegistry";
import { getSession } from "../state/sessionStore";

export async function processFlow(user: string, content: string) {
  const session = getSession(user);
  const normalized = content.trim().toLowerCase();

  /*
   =========================
   FLOWS DINÂMICOS
   =========================
  */

  const flows = getFlows();
  const currentFlow = flows[session.currentFlow];

  if (!currentFlow) {
    return {
      messages: ["❌ Fluxo não encontrado."],
    };
  }

  const currentStep = currentFlow.steps[session.currentStep];

  if (!currentStep) {
    return {
      messages: ["❌ Step não encontrado."],
    };
  }

  /*
   =========================
   COMANDOS GLOBAIS
   =========================
  */

  const globalCommands: Record<string, () => { messages: string[] }> = {
    /*
     VOLTAR PARA INÍCIO DO FLOW ATUAL
    */
    voltar: () => {
      session.currentStep = currentFlow.initialStep;

      const step = currentFlow.steps[session.currentStep];

      return {
        messages: step.message,
      };
    },

    /*
     MENU PRINCIPAL
    */
    menu: () => {
      session.currentFlow = "main";
      session.currentStep = "menu";
      session.stack = [];

      const flow = flows["main"];
      const step = flow.steps["menu"];

      return {
        messages: step.message,
      };
    },

    /*
     RESET TOTAL
    */
    reset: () => {
      session.currentFlow = "main";
      session.currentStep = "menu";
      session.stack = [];

      const flow = flows["main"];
      const step = flow.steps["menu"];

      return {
        messages: step.message,
      };
    },
  };

  /*
   =========================
   EXECUTA COMANDOS GLOBAIS
   =========================
  */

  if (globalCommands[normalized]) {
    return globalCommands[normalized]();
  }

  /*
   =========================
   SAUDAÇÕES
   =========================
  */

  if (["oi", "ola", "olá", "hello", "eae"].includes(normalized)) {
    return {
      messages: currentStep.message,
    };
  }

  /*
   =========================
   ENCONTRA OPÇÃO
   =========================
  */

  const option = currentStep.options?.find(
    (option) => option.key.toLowerCase() === normalized,
  );

  /*
   =========================
   OPÇÃO INVÁLIDA
   =========================
  */

  if (!option) {
    return {
      messages: ["❌ Opção inválida."],
    };
  }

  /*
   =========================
   VOLTAR
   =========================
  */

  if (option.back) {
    const previous = session.stack.pop();

    if (previous) {
      session.currentFlow = previous.flow;
      session.currentStep = previous.step;
    }
  } else if (option.nextFlow) {
    /*
   =========================
   TROCAR FLOW
   =========================
  */
    session.stack.push({
      flow: session.currentFlow,
      step: session.currentStep,
    });

    session.currentFlow = option.nextFlow;

    session.currentStep = option.nextStep || flows[option.nextFlow].initialStep;
  } else if (option.goToStep) {
    /*
   =========================
   IR PARA STEP
   =========================
  */
    session.currentStep = option.goToStep;
  } else if (option.nextStep) {
    /*
   =========================
   PRÓXIMO STEP
   =========================
  */
    session.currentStep = option.nextStep;
  }

  /*
   =========================
   BUSCA NOVO ESTADO
   =========================
  */

  const nextFlow = flows[session.currentFlow];

  const nextStep = nextFlow.steps[session.currentStep];

  return {
    messages: nextStep.message,
  };
}
