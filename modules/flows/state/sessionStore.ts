import { logger } from "../../../shared/utils/logger";

type StackItem = {
  flow: string;
  step: string;
};

// Interface auxiliar para os metadados do agendamento temporário
export type CustomServicesState = {
  step: "SELECT_SERVICE" | "PROCESS_SERVICE" | "PROCESS_DAY" | "PROCESS_HOUR";
  selectedService?: any;
  selectedDate?: string;
  selectedDateLabel?: string;
  tempDaysMap?: Array<{ dateStr: string; label: string }>;
  tempHoursMap?: string[];
};

export type Session = {
  currentFlow: string;
  currentStep: string;
  welcome: boolean;
  atendimento: "automatico" | "em_espera" | "em_atendimento";
  pushName: string;
  lastMessage: string;
  updatedAt: Date;
  stack: StackItem[];
  botMessageIds?: string[];
  customServicesState?: CustomServicesState; // 🔥 Adicionado para sanar o erro do TS
};

const sessions = new Map<string, Session>();

export function getSession(remoteJid: string, sessionId: string) {
  const compositeKey = `${sessionId}:${remoteJid}`;

  if (!sessions.has(compositeKey)) {
    logger.info(
      `[Tenant: ${sessionId}] Novo estado de chat criado para o lead: ${remoteJid}`,
    );
    sessions.set(compositeKey, {
      currentFlow: "main",
      currentStep: "menu",
      welcome: false,
      atendimento: "automatico",
      pushName: "Cliente WhatsApp",
      lastMessage: "",
      updatedAt: new Date(),
      stack: [],
    });
  }

  return sessions.get(compositeKey)!;
}

export function getActiveChatsBySession(sessionId: string) {
  const list: Array<{ jid: string } & Partial<Session>> = [];
  const prefix = `${sessionId}:`;

  for (const [key, value] of sessions.entries()) {
    if (key.startsWith(prefix)) {
      const jid = key.split(":")[1];
      if (value.atendimento !== "automatico") {
        list.push({
          jid,
          ...value,
        });
      }
    }
  }

  return list.sort((a, b) => b.updatedAt!.getTime() - a.updatedAt!.getTime());
}

export function updateChatStatus(
  remoteJid: string,
  sessionId: string,
  status: "automatico" | "em_atendimento",
) {
  const compositeKey = `${sessionId}:${remoteJid}`;
  if (sessions.has(compositeKey)) {
    const session = sessions.get(compositeKey)!;
    session.atendimento = status;
    session.updatedAt = new Date();

    if (status === "automatico") {
      session.currentFlow = "main";
      session.currentStep = "menu";
      session.welcome = false;
    }
    return true;
  }
  return false;
}
