import { dbClient } from "../../shared/database";
import { BusinessHoursConfig } from "../../shared/utils/businessHours";

export interface UserDTO {
  id: string; // Representa o UUID v4 do banco
  name: string;
  email: string;
  passwordHash: string;
  whatsappSessionId: string;
  businessHours?: BusinessHoursConfig;
  createdAt: string;
}

// ==========================================
// HELPERS DE VALIDAÇÃO E TRATAMENTO
// ==========================================

/**
 * 💡 Remove o prefixo "sess_" caso a string seja um sessionId,
 * retornando apenas o UUID puro esperado pelo banco de dados.
 */
function resolveUserId(idOrSession: string): string {
  if (!idOrSession) return "";
  return idOrSession.startsWith("sess_")
    ? idOrSession.replace("sess_", "")
    : idOrSession;
}

// Valida se a string final é realmente um UUID antes de mandar pro Postgres
function isValidUUID(id: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

// ==========================================
// REPOSITÓRIO
// ==========================================

export async function getUsers(): Promise<UserDTO[]> {
  const query = `
    SELECT id, name, email, password_hash as "passwordHash", whatsapp_session_id as "whatsappSessionId", business_hours as "businessHours", created_at as "createdAt"
    FROM users
  `;
  return dbClient.query<UserDTO>(query);
}

export async function getBusinessHoursByUserId(
  userId: string,
): Promise<BusinessHoursConfig | undefined> {
  const pureUserId = resolveUserId(userId);

  // 🛡️ Evita o crash do banco se o ID extraído não for um UUID válido
  if (!isValidUUID(pureUserId)) {
    console.warn(
      `[getBusinessHoursByUserId] Recebido ID inválido para UUID: "${pureUserId}". Abortando query.`,
    );
    return undefined;
  }

  const query = `SELECT business_hours as "businessHours" FROM users WHERE id = $1`;
  const rows = await dbClient.query<{ businessHours: BusinessHoursConfig }>(
    query,
    [pureUserId],
  );

  return rows[0]?.businessHours;
}

export async function updateUserProfile(
  userId: string,
  profileData: Partial<Omit<UserDTO, "id" | "passwordHash" | "createdAt">>,
): Promise<UserDTO | undefined> {
  const pureUserId = resolveUserId(userId);

  if (!isValidUUID(pureUserId)) {
    throw new Error(
      `[updateUserProfile] O user_id "${pureUserId}" não é um UUID válido.`,
    );
  }

  const fields: string[] = [];
  const values: any[] = [];
  let index = 2;

  const mapping: Record<string, string> = {
    name: "name",
    email: "email",
    whatsappSessionId: "whatsapp_session_id",
    businessHours: "business_hours",
  };

  for (const [key, val] of Object.entries(profileData)) {
    if (mapping[key]) {
      fields.push(`${mapping[key]} = $${index}`);
      values.push(typeof val === "object" ? JSON.stringify(val) : val);
      index++;
    }
  }

  if (fields.length === 0) return undefined;

  const query = `
    UPDATE users 
    SET ${fields.join(", ")}
    WHERE id = $1
    RETURNING id, name, email, password_hash as "passwordHash", whatsapp_session_id as "whatsappSessionId", business_hours as "businessHours", created_at as "createdAt"
  `;

  const rows = await dbClient.query<UserDTO>(query, [pureUserId, ...values]);
  return rows[0];
}
