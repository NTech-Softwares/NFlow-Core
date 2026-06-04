import { logger } from "../../../shared/utils/logger";
import { dbClient } from "../../../shared/database";

type StackItem = {
  flow: string;
  step: string;
};

export type CustomServicesState = {
  step: "SELECT_SERVICE" | "PROCESS_SERVICE" | "PROCESS_DAY" | "PROCESS_HOUR";
  selectedService?: any;
  selectedDates?: string[];
  selectedDatesLabels?: string;
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
  customServicesState?: CustomServicesState;
};

/**
 * 🚀 ATENÇÃO DEV: O `sessionId` deve ser sempre o `whatsappSessionId` (Formato: sess_UUID)
 */
export async function getSession(
  remoteJid: string,
  sessionId: string,
): Promise<Session> {
  const query = `
    SELECT current_flow, current_step, welcome, atendimento, push_name, last_message, updated_at, stack, bot_message_ids, custom_services_state
    FROM chat_sessions 
    WHERE session_id = $1 AND remote_jid = $2
  `;

  try {
    const rows = await dbClient.query(query, [sessionId, remoteJid]);

    if (rows.length === 0) {
      logger.info(
        `[Tenant: ${sessionId}] Novo estado de chat criado no Banco para o lead: ${remoteJid}`,
      );

      const defaultSession = {
        current_flow: "main",
        current_step: "menu",
        welcome: false,
        atendimento: "automatico",
        push_name: "Cliente WhatsApp",
        last_message: "",
        stack: JSON.stringify([]),
        bot_message_ids: JSON.stringify([]),
      };

      await dbClient.query(
        `
        INSERT INTO chat_sessions (session_id, remote_jid, current_flow, current_step, welcome, atendimento, push_name, last_message, stack, bot_message_ids)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `,
        [
          sessionId,
          remoteJid,
          defaultSession.current_flow,
          defaultSession.current_step,
          defaultSession.welcome,
          defaultSession.atendimento,
          defaultSession.push_name,
          defaultSession.last_message,
          defaultSession.stack,
          defaultSession.bot_message_ids,
        ],
      );

      return {
        currentFlow: defaultSession.current_flow,
        currentStep: defaultSession.current_step,
        welcome: defaultSession.welcome,
        atendimento: "automatico",
        pushName: defaultSession.push_name,
        lastMessage: defaultSession.last_message,
        updatedAt: new Date(),
        stack: [],
        botMessageIds: [],
      };
    }

    const row = rows[0];
    return {
      currentFlow: row.current_flow,
      currentStep: row.current_step,
      welcome: row.welcome,
      atendimento: row.atendimento,
      pushName: row.push_name,
      lastMessage: row.last_message,
      updatedAt: new Date(row.updated_at),
      stack:
        typeof row.stack === "string" ? JSON.parse(row.stack) : row.stack || [],
      botMessageIds:
        typeof row.bot_message_ids === "string"
          ? JSON.parse(row.bot_message_ids)
          : row.bot_message_ids || [],
      customServicesState:
        typeof row.custom_services_state === "string"
          ? JSON.parse(row.custom_services_state)
          : row.custom_services_state,
    };
  } catch (error) {
    logger.error(
      `Erro ao gerenciar sessão no Postgres para ${remoteJid}:`,
      error,
    );
    throw error;
  }
}

/**
 * 🚀 ATENÇÃO DEV: O `sessionId` deve ser sempre o `whatsappSessionId` (Formato: sess_UUID)
 */
export async function saveSession(
  remoteJid: string,
  sessionId: string,
  session: Partial<Session>,
): Promise<void> {
  const fields: string[] = [];
  const values: any[] = [];
  let index = 3;

  const mapping: Record<string, string> = {
    currentFlow: "current_flow",
    currentStep: "current_step",
    welcome: "welcome",
    atendimento: "atendimento",
    pushName: "push_name",
    lastMessage: "last_message",
    stack: "stack",
    botMessageIds: "bot_message_ids",
    customServicesState: "custom_services_state",
  };

  for (const [key, val] of Object.entries(session)) {
    if (mapping[key]) {
      fields.push(`${mapping[key]} = $${index}`);
      if (typeof val === "object" && val !== null) {
        values.push(JSON.stringify(val));
      } else {
        values.push(val);
      }
      index++;
    }
  }

  if (fields.length === 0) return;

  const query = `
    UPDATE chat_sessions 
    SET ${fields.join(", ")}, updated_at = CURRENT_TIMESTAMP
    WHERE session_id = $1 AND remote_jid = $2
  `;

  await dbClient.query(query, [sessionId, remoteJid, ...values]);
}

export async function getActiveChatsBySession(sessionId: string) {
  const query = `
    SELECT remote_jid as jid, current_flow, current_step, welcome, atendimento, push_name, last_message, updated_at
    FROM chat_sessions
    WHERE session_id = $1 AND atendimento != 'automatico'
    ORDER BY updated_at DESC
  `;
  return await dbClient.query(query, [sessionId]);
}

export async function updateChatStatus(
  remoteJid: string,
  sessionId: string,
  status: "automatico" | "em_espera" | "em_atendimento",
) {
  try {
    if (status === "automatico") {
      await dbClient.query(
        `
        UPDATE chat_sessions 
        SET atendimento = $1, current_flow = 'main', current_step = 'menu', welcome = false, updated_at = CURRENT_TIMESTAMP
        WHERE session_id = $2 AND remote_jid = $3
      `,
        [status, sessionId, remoteJid],
      );
    } else {
      await dbClient.query(
        `
        UPDATE chat_sessions 
        SET atendimento = $1, updated_at = CURRENT_TIMESTAMP
        WHERE session_id = $2 AND remote_jid = $3
      `,
        [status, sessionId, remoteJid],
      );
    }
    return true;
  } catch {
    return false;
  }
}
