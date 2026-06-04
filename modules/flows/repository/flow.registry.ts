import { dbClient } from "../../../shared/database";
import { Flow } from "../domain/flow.types";
import { logger } from "../../../shared/utils/logger";

// ==========================================
// HELPERS DE VALIDAÇÃO E TRATAMENTO
// ==========================================

function resolveUserId(idOrSession: string): string {
  if (!idOrSession) return "";
  return idOrSession.startsWith("sess_")
    ? idOrSession.replace("sess_", "")
    : idOrSession;
}

function isValidUUID(id: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

export const DEFAULT_FLOW_TEMPLATE: Record<string, Flow> = {
  main: {
    id: "main",
    name: "Menu Principal",
    initialStep: "menu",
    steps: {
      menu: {
        id: "menu",
        name: "Menu Inicial",
        message: [
          "👋 Olá! Seja bem-vindo(a) ao seu novo atendimento automático.",
          "",
          "Você ainda não configurou as opções deste menu.",
          "Crie fluxos de atendimento para o seu bot!",
        ],
        options: [{ key: "0", back: true }],
      },
    },
  },
};

/**
 * Retorna o fluxo customizado de uma sessão específica baseada no ID do usuário (UUID)
 */
export async function getFlowsForSession(
  sessionId: string,
  userId: string,
): Promise<Record<string, Flow>> {
  const pureUserId = resolveUserId(userId);

  if (!isValidUUID(pureUserId)) {
    logger.warn(
      `[Registry] getFlowsForSession recebeu ID inválido: "${pureUserId}". Retornando template padrão.`,
    );
    return DEFAULT_FLOW_TEMPLATE;
  }

  const query = `SELECT flows FROM user_flows WHERE user_id = $1`;

  try {
    const rows = await dbClient.query<{ flows: Record<string, Flow> }>(query, [
      pureUserId,
    ]);

    if (rows.length === 0) {
      logger.info(
        `[Registry] Inicializando template minimalista padrão no Banco para o User ID: ${pureUserId} (Sessão: ${sessionId})`,
      );

      await saveFlowsForSession(sessionId, pureUserId, DEFAULT_FLOW_TEMPLATE);
      return DEFAULT_FLOW_TEMPLATE;
    }

    return rows[0].flows;
  } catch (error: any) {
    logger.error(
      `Erro ao carregar fluxos para o User ID [${pureUserId}] (Sessão: ${sessionId}) no Banco: ${error.message}`,
    );
    return DEFAULT_FLOW_TEMPLATE;
  }
}

/**
 * Salva um novo fluxo customizado vindo do painel para um usuário específico
 */
export async function saveFlowsForSession(
  sessionId: string,
  userId: string,
  newFlows: Record<string, Flow>,
): Promise<void> {
  const pureUserId = resolveUserId(userId);

  if (!isValidUUID(pureUserId)) {
    logger.error(
      `[Registry] saveFlowsForSession falhou. O user_id "${pureUserId}" não é um UUID válido.`,
    );
    return;
  }

  const query = `
    INSERT INTO user_flows (user_id, flows, updated_at)
    VALUES ($1, $2, CURRENT_TIMESTAMP)
    ON CONFLICT (user_id) 
    DO UPDATE SET flows = EXCLUDED.flows, updated_at = CURRENT_TIMESTAMP
  `;

  await dbClient.query(query, [pureUserId, JSON.stringify(newFlows)]);
  logger.info(
    `[Registry] Fluxos atualizados com sucesso no Banco para o User ID: ${pureUserId} (Sessão: ${sessionId})`,
  );
}
