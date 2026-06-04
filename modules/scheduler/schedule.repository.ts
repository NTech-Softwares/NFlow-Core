import { dbClient } from "../../shared/database";
import { ScheduledMessage, ScheduleStatus } from "./schedule.types";

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

/**
 * Função Auxiliar para mapear as linhas do Postgres para a interface do Domínio
 */
function mapRowToScheduledMessage(row: any): ScheduledMessage {
  let parsedMessage = row.message;
  if (typeof row.message === "string") {
    try {
      parsedMessage = JSON.parse(row.message);
    } catch {
      parsedMessage = { text: row.message };
    }
  }

  let parsedPayload = row.payload;
  if (typeof row.payload === "string") {
    try {
      parsedPayload = JSON.parse(row.payload);
    } catch {
      parsedPayload = {};
    }
  }

  return {
    id: row.id,
    userId: row.user_id,
    sessionId: row.session_id,
    remoteJid: row.remote_jid,
    message: parsedMessage,
    scheduledAt: row.send_at
      ? new Date(row.send_at).toISOString()
      : row.scheduled_at,
    status: row.status,
    retryCount: row.retry_count || 0,
    maxRetries: row.max_retries || 3,
    error: row.error_message || undefined,
    createdAt: row.created_at
      ? new Date(row.created_at).toISOString()
      : new Date().toISOString(),
    payload: parsedPayload,
  };
}

export async function getSchedulesByTenant(
  userId: string,
): Promise<ScheduledMessage[]> {
  const pureUserId = resolveUserId(userId);
  if (!isValidUUID(pureUserId)) return [];

  const query = `
    SELECT id, user_id, session_id, remote_jid, message, status, send_at, payload, created_at 
    FROM public.scheduled_messages 
    WHERE user_id = $1
    ORDER BY created_at ASC
  `;
  const rows = await dbClient.query(query, [pureUserId.toLowerCase()]);
  return rows.map(mapRowToScheduledMessage);
}

export async function addSchedule(
  userId: string,
  newSchedule: ScheduledMessage,
): Promise<void> {
  const pureUserId = resolveUserId(userId);

  if (!isValidUUID(pureUserId)) {
    throw new Error(
      `[addSchedule] O user_id "${pureUserId}" não é um UUID válido.`,
    );
  }

  const query = `
    INSERT INTO public.scheduled_messages (id, user_id, session_id, remote_jid, message, status, send_at, payload, created_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
    ON CONFLICT (id) DO UPDATE 
    SET 
      session_id = EXCLUDED.session_id,
      remote_jid = EXCLUDED.remote_jid, 
      message = EXCLUDED.message, 
      status = EXCLUDED.status, 
      send_at = EXCLUDED.send_at, 
      payload = EXCLUDED.payload
  `;

  await dbClient.query(query, [
    newSchedule.id,
    pureUserId.toLowerCase(),
    newSchedule.sessionId,
    newSchedule.remoteJid,
    JSON.stringify(newSchedule.message),
    newSchedule.status,
    newSchedule.scheduledAt,
    JSON.stringify(newSchedule.payload || {}),
  ]);
}

export async function updateSchedule(
  userId: string,
  scheduleId: string,
  updates: Partial<ScheduledMessage>,
): Promise<void> {
  const pureUserId = resolveUserId(userId);
  if (!isValidUUID(pureUserId)) return;

  const fields: string[] = [];
  const values: any[] = [];
  let index = 3;

  const mapping: Record<string, string> = {
    sessionId: "session_id",
    remoteJid: "remote_jid",
    message: "message",
    status: "status",
    scheduledAt: "send_at",
    payload: "payload",
  };

  for (const [key, val] of Object.entries(updates)) {
    if (mapping[key]) {
      fields.push(`${mapping[key]} = $${index}`);
      values.push(typeof val === "object" ? JSON.stringify(val) : val);
      index++;
    }
  }

  if (fields.length === 0) return;

  const query = `
    UPDATE public.scheduled_messages 
    SET ${fields.join(", ")}
    WHERE id = $1 AND user_id = $2
  `;
  await dbClient.query(query, [
    scheduleId,
    pureUserId.toLowerCase(),
    ...values,
  ]);
}

export async function deleteSchedule(
  userId: string,
  scheduleId: string,
): Promise<void> {
  const pureUserId = resolveUserId(userId);
  if (!isValidUUID(pureUserId)) return;

  const query = `DELETE FROM public.scheduled_messages WHERE id = $1 AND user_id = $2`;
  await dbClient.query(query, [scheduleId, pureUserId.toLowerCase()]);
}

export async function getAllPendingSchedules(): Promise<ScheduledMessage[]> {
  return getAllSchedulesByStatus("pending");
}

export async function getAllCanceledSchedules(): Promise<ScheduledMessage[]> {
  return getAllSchedulesByStatus("canceled");
}

async function getAllSchedulesByStatus(
  status: ScheduleStatus,
): Promise<ScheduledMessage[]> {
  const query = `
    SELECT id, user_id, session_id, remote_jid, message, status, send_at, payload, created_at 
    FROM public.scheduled_messages 
    WHERE status = $1
    ORDER BY send_at ASC
  `;
  const rows = await dbClient.query(query, [status]);
  return rows.map(mapRowToScheduledMessage);
}
