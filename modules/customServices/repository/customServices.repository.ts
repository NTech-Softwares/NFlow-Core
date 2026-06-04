import { dbClient } from "../../../shared/database";
import {
  CustomServicesConfig,
  Appointment,
} from "../domain/customServices.types";

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
// CONFIGURAÇÕES (Mantido como Documento JSON)
// ==========================================
export async function getConfigByTenant(
  userId: string,
): Promise<CustomServicesConfig | null> {
  const pureUserId = resolveUserId(userId);

  // 🛡️ Evita o crash do banco se o ID extraído não for um UUID válido
  if (!isValidUUID(pureUserId)) {
    console.warn(
      `[getConfigByTenant] Recebido um ID inválido para UUID: "${pureUserId}". Abortando query.`,
    );
    return null;
  }

  const query = `SELECT config FROM custom_services_configs WHERE user_id = $1`;
  const rows = await dbClient.query<{ config: CustomServicesConfig }>(query, [
    pureUserId.toLowerCase(),
  ]);

  if (rows.length === 0) return null;
  return rows[0].config;
}

export async function saveConfigByTenant(
  userId: string,
  config: CustomServicesConfig,
): Promise<void> {
  const pureUserId = resolveUserId(userId);

  if (!isValidUUID(pureUserId)) {
    throw new Error(
      `[saveConfigByTenant] Não é possível salvar. O user_id "${pureUserId}" não é um UUID válido.`,
    );
  }

  const query = `
    INSERT INTO custom_services_configs (user_id, config, updated_at)
    VALUES ($1, $2, CURRENT_TIMESTAMP)
    ON CONFLICT (user_id) 
    DO UPDATE SET config = EXCLUDED.config, updated_at = CURRENT_TIMESTAMP
  `;
  await dbClient.query(query, [
    pureUserId.toLowerCase(),
    JSON.stringify(config),
  ]);
}

// ==========================================
// AGENDAMENTOS (Refatorado para Estrutura Relacional)
// ==========================================

/**
 * Busca todos os agendamentos de um tenant mapeados para a tipagem do domínio.
 */
export async function getAppointmentsByTenant(
  userId: string,
): Promise<Appointment[]> {
  const pureUserId = resolveUserId(userId);

  if (!isValidUUID(pureUserId)) return [];

  const query = `
    SELECT 
      id,
      user_id,
      session_id,
      remote_jid,
      client_name,
      service_id,
      service,
      date::text as date_str,
      "time"::text as time_str,
      created_at,
      reminders_scheduled,
      parent_id,
      class_index
    FROM public.appointments 
    WHERE user_id = $1 
    ORDER BY created_at DESC
  `;

  const res = await dbClient.query(query, [pureUserId.toLowerCase()]);

  return res.map((row: any) => ({
    id: row.id,
    userId: row.user_id,
    sessionId: row.session_id,
    remoteJid: row.remote_jid,
    clientName: row.client_name,
    serviceId: row.service_id,
    service: row.service,
    date: row.date_str,
    time: row.time_str,
    createdAt: row.created_at,
    remindersScheduled: row.reminders_scheduled,
    parentId: row.parent_id || undefined,
    classIndex: row.class_index !== null ? row.class_index : undefined,
  }));
}

/**
 * Salva um único agendamento mapeando as propriedades do objeto diretamente
 * nas colunas independentes da tabela Postgres.
 */
export async function insertAppointment(
  appointment: Appointment,
): Promise<void> {
  const pureUserId = resolveUserId(appointment.userId);

  if (!isValidUUID(pureUserId)) {
    throw new Error(
      `[insertAppointment] O campo userId "${pureUserId}" precisa ser um UUID válido.`,
    );
  }

  const query = `
    INSERT INTO public.appointments (
      id, 
      user_id, 
      session_id, 
      remote_jid, 
      client_name, 
      service_id, 
      service, 
      date, 
      "time", 
      reminders_scheduled, 
      parent_id, 
      class_index, 
      created_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP)
  `;

  await dbClient.query(query, [
    appointment.id,
    pureUserId.toLowerCase(), // 🎯 Salva o UUID limpo na coluna
    appointment.sessionId,
    appointment.remoteJid,
    appointment.clientName,
    appointment.serviceId,
    JSON.stringify(appointment.service),
    appointment.date,
    appointment.time,
    JSON.stringify(appointment.remindersScheduled),
    appointment.parentId || null,
    appointment.classIndex !== undefined ? appointment.classIndex : null,
  ]);
}

/**
 * Remove um agendamento individual diretamente do banco de dados baseado na PK
 */
export async function deleteAppointment(
  userId: string,
  appointmentId: string,
): Promise<void> {
  const pureUserId = resolveUserId(userId);

  if (!isValidUUID(pureUserId)) return;

  const query = `DELETE FROM public.appointments WHERE user_id = $1 AND id = $2`;
  await dbClient.query(query, [pureUserId.toLowerCase(), appointmentId]);
}
