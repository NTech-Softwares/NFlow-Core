import { logger } from "../../../../shared/utils/logger";

type StackItem = {
  flow: string;
  step: string;
};

type Session = {
  currentFlow: string;
  currentStep: string;
  welcome: boolean;

  stack: StackItem[];
};

const sessions = new Map<string, Session>();

export function getSession(user: string) {
  if (!sessions.has(user)) {
    logger.info(`Nova seção criada - ${user}`);
    sessions.set(user, {
      currentFlow: "main",
      currentStep: "menu",
      welcome: false,

      stack: [],
    });
  }

  logger.info(`Secoes Atuais - ${sessions.size}`);
  return sessions.get(user)!;
}
