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

// Map global na memória, mas com chaves compostas e isoladas
const sessions = new Map<string, Session>();

/**
 * Recupera ou cria o estado de conversação de um lead, isolado por inquilino.
 * @param remoteJid O JID do cliente que está mandando mensagem
 * @param sessionId O ID da sessão do dono do Bot
 */
export function getSession(remoteJid: string, sessionId: string) {
  // 🎯 CHAVE COMPOSTA EXCLUSIVA: impede colisão entre clientes de tenants diferentes
  const compositeKey = `${sessionId}:${remoteJid}`;

  if (!sessions.has(compositeKey)) {
    logger.info(
      `[Tenant: ${sessionId}] Novo estado de chat criado para o lead: ${remoteJid}`,
    );
    sessions.set(compositeKey, {
      currentFlow: "main",
      currentStep: "menu",
      welcome: false,
      stack: [],
    });
  }

  return sessions.get(compositeKey)!;
}
