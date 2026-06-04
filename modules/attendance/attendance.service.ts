import {
  getActiveChatsBySession,
  updateChatStatus,
  getSession,
  saveSession, // Adicionado para persistir estados complexos se necessário
} from "../chat/sessionStore";
import db from "../../shared/database";
import { logger } from "../../shared/utils/logger";

/**
 * Filtra as sessões no Postgres do Tenant atual que precisam de suporte humano
 */
export async function listHumanAttendanceSessions(
  sessionId: string,
): Promise<any[]> {
  // 🔥 Adicionado AWAIT para buscar dados reais do banco
  const activeChats = await getActiveChatsBySession(sessionId);

  return activeChats.map((chat) => ({
    ...chat,
    remoteJid: chat.jid,
  }));
}

/**
 * Altera o estado do atendimento para o operador humano assumir a conversa (Botão Em Atendimento)
 */
export async function changeAttendanceStatus(
  sessionId: string,
  remoteJid: string,
  status: "em_espera" | "em_atendimento",
): Promise<boolean> {
  // 🔥 Adicionado AWAIT para aguardar a query de update rodar no Postgres
  const success = await updateChatStatus(remoteJid, sessionId, status);

  if (!success) {
    throw new Error(
      "Não foi possível encontrar uma sessão ativa para este contato.",
    );
  }

  logger.info(
    `[Core Attendance] Contato ${remoteJid} alterado para: ${status} (Sessão: ${sessionId})`,
  );
  return true;
}

/**
 * Encerra o atendimento humano e devolve o controle total para o Bot (Botão Voltar Pro Bot)
 */
export async function resetToBotAutomation(
  sessionId: string,
  remoteJid: string,
): Promise<boolean> {
  // 🔥 Adicionado AWAIT para aguardar a query de update rodar no Postgres
  const success = await updateChatStatus(remoteJid, sessionId, "automatico");

  if (!success) {
    throw new Error(
      "Não foi possível encontrar a sessão para devolver ao robô.",
    );
  }

  logger.info(
    `[Core Attendance] Automação reativada para ${remoteJid} (Sessão: ${sessionId})`,
  );
  return true;
}

/**
 * Remove completamente a sessão de atendimento do banco (Botão Excluir Atendimento)
 * Nota: Como adicionou na listagem, criamos a deleção direta no banco por segurança.
 */
export async function clearAttendanceSession(
  sessionId: string,
  remoteJid: string,
): Promise<boolean> {
  await db.query(
    `DELETE FROM chat_sessions WHERE session_id = $1 AND remote_jid = $2`,
    [sessionId, remoteJid],
  );
  return true;
}

/**
 * Interceptador Automático de Mensagem do Atendente
 * Se o chat estiver 'em_espera' e o atendente mandar mensagem, joga para 'em_atendimento' automaticamente.
 */
export async function autoAdvanceOnOperatorMessage(
  sessionId: string,
  remoteJid: string,
): Promise<void> {
  // 🔥 Adicionado AWAIT para recuperar o estado real de concorrência do banco
  const session = await getSession(remoteJid, sessionId);

  if (session && session.atendimento === "em_espera") {
    // 🔥 Adicionado AWAIT para a gravação síncrona de status do chat
    await updateChatStatus(remoteJid, sessionId, "em_atendimento");
    logger.info(
      `[Core Attendance] Auto-avanço: ${remoteJid} movido para 'em_atendimento' por ação do operador.`,
    );
  }
}
