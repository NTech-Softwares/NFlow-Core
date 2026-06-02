import {
  getActiveChatsBySession,
  updateChatStatus,
  getSession,
  deleteChatSession, // 🟢 Certifique-se de exportar um método de exclusão no seu sessionStore se existir
} from "../flows/state/sessionStore";

/**
 * Filtra as sessões em memória do Tenant atual que precisam de suporte humano
 */
export async function listHumanAttendanceSessions(
  sessionId: string,
): Promise<any[]> {
  const activeChats = getActiveChatsBySession(sessionId);

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
  const success = updateChatStatus(remoteJid, sessionId, status as any);

  if (!success) {
    throw new Error(
      "Não foi possível encontrar uma sessão ativa para este contato.",
    );
  }

  console.log(
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
  const success = updateChatStatus(remoteJid, sessionId, "automatico");

  if (!success) {
    throw new Error(
      "Não foi possível encontrar a sessão para devolver ao robô.",
    );
  }

  console.log(
    `[Core Attendance] Automação reativada para ${remoteJid} (Sessão: ${sessionId})`,
  );
  return true;
}

/**
 * 🟢 NOVO: Remove completamente a sessão de atendimento da memória (Botão Excluir Atendimento)
 */
export async function clearAttendanceSession(
  sessionId: string,
  remoteJid: string,
): Promise<boolean> {
  // Caso seu sessionStore use outro nome, mude aqui. Geralmente é deletar a chave do objeto/map.
  const success = deleteChatSession(remoteJid, sessionId);

  if (!success) {
    throw new Error(
      "Atendimento não encontrado ou já foi removido da memória.",
    );
  }

  console.log(
    `[Core Attendance] Atendimento deletado definitivamente para ${remoteJid}`,
  );
  return true;
}

/**
 * 🟢 NOVO: Interceptador Automático de Mensagem do Atendente
 * Se o chat estiver 'em_espera' e o atendente mandar mensagem, joga para 'em_atendimento' automaticamente.
 */
export async function autoAdvanceOnOperatorMessage(
  sessionId: string,
  remoteJid: string,
): Promise<void> {
  const session = getSession(remoteJid, sessionId);

  if (session && session.atendimento === "em_espera") {
    updateChatStatus(remoteJid, sessionId, "em_atendimento");
    console.log(
      `[Core Attendance] Auto-avanço: ${remoteJid} movido para 'em_atendimento' por ação do operador.`,
    );
  }
}
