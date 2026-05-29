import { getWhatsapp } from "../client";

/**
 * Lista todos os grupos participantes de uma sessão específica (Multi-Tenant)
 */
export async function getGroups(sessionId: string) {
  // 🎯 Recebe o sessionId do inquilino

  // 🎯 Passa o sessionId para buscar o socket correto deste cliente no Map
  const sock = getWhatsapp(sessionId);

  if (!sock) {
    throw new Error(`WhatsApp não iniciado para a sessão: ${sessionId}`);
  }

  // Busca os grupos direto da instância do Baileys deste usuário
  const groups = await sock.groupFetchAllParticipating();

  return Object.values(groups).map((group) => ({
    id: group.id,
    name: group.subject, // O Baileys chama o nome do grupo de 'subject'
    participants: group.participants ? group.participants.length : 0,
  }));
}
