import { dbClient } from "../database";
import { logger } from "../utils/logger";

export interface QueueJob {
  id: string;
  sessionId: string;
  jid: string;
  messageText: string;
  imagePath?: string;
  status: string;
  attempts: number;
  sendAt: Date;
  userId?: string;
  scheduleId?: string;
}

class MessageQueueManager {
  /**
   * Adiciona um novo trabalho na fila do banco de dados
   */
  public async push(
    job: Omit<QueueJob, "id" | "status" | "attempts" | "sendAt">,
  ): Promise<void> {
    try {
      await dbClient.query(
        `INSERT INTO whatsapp_scheduled_messages 
        (session_id, jid, message_text, image_path, status, user_id, schedule_id)
        VALUES ($1, $2, $3, $4, 'pending', $5, $6)`,
        [
          job.sessionId,
          job.jid,
          job.messageText,
          job.imagePath || null,
          job.userId || null,
          job.scheduleId || null,
        ],
      );
      logger.info(
        `[Queue DB] Novo job agendado para ${job.jid} (Sessão: ${job.sessionId})`,
      );
    } catch (error: any) {
      logger.error(`[Queue DB] Erro ao inserir job na fila: ${error.message}`);
    }
  }

  /**
   * Busca um lote de jobs pendentes, travando-os para outros workers (SKIP LOCKED)
   */
  public async fetchBatch(limit: number = 5): Promise<QueueJob[]> {
    try {
      // 🚀 O CORAÇÃO DA ESCALABILIDADE: Bloqueia as linhas apenas para este Worker
      const rows = await dbClient.query(
        `
        UPDATE whatsapp_scheduled_messages 
        SET status = 'processing', updated_at = CURRENT_TIMESTAMP
        WHERE id IN (
          SELECT id FROM whatsapp_scheduled_messages
          WHERE status = 'pending' AND send_at <= CURRENT_TIMESTAMP
          ORDER BY send_at ASC
          FOR UPDATE SKIP LOCKED
          LIMIT $1
        )
        RETURNING 
        id, 
        session_id as "sessionId", 
        jid, 
        message_text as "messageText", 
        image_path as "imagePath", 
        status, attempts, 
        send_at as "sendAt", 
        user_id as "userId", 
        schedule_id as "scheduleId";
      `,
        [limit],
      );

      return rows as QueueJob[];
    } catch (error: any) {
      logger.error(`[Queue DB] Erro ao buscar batch de jobs: ${error.message}`);
      return [];
    }
  }

  /**
   * Marca um lote inteiro de jobs como concluídos de uma só vez
   */
  public async completeBatch(jobIds: string[]): Promise<void> {
    if (jobIds.length === 0) return;
    try {
      await dbClient.query(
        `UPDATE whatsapp_scheduled_messages 
       SET status = 'completed', updated_at = CURRENT_TIMESTAMP 
       WHERE id = ANY($1)`,
        [jobIds],
      );
    } catch (e: any) {
      logger.error(`[Queue DB] Erro ao concluir lote de jobs: ${e.message}`);
    }
  }

  /**
   * Marca o job como concluído
   */
  public async complete(jobId: string): Promise<void> {
    await dbClient
      .query(
        `UPDATE whatsapp_scheduled_messages SET status = 'completed', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [jobId],
      )
      .catch((e) =>
        logger.error(`[Queue DB] Erro ao concluir job ${jobId}: ${e.message}`),
      );
  }

  /**
   * Falha o job e aplica retry (backoff) se aplicável
   */
  public async fail(
    jobId: string,
    attempts: number,
    errorMessage: string,
  ): Promise<void> {
    const maxAttempts = 3;
    const isDefinitiveFailure = attempts >= maxAttempts;

    // Se ainda pode tentar, volta pra pending e adiciona 1 minuto de delay (Backoff)
    const newStatus = isDefinitiveFailure ? "failed" : "pending";
    const delayMinutes = isDefinitiveFailure ? 0 : 1;

    await dbClient
      .query(
        `UPDATE whatsapp_scheduled_messages 
       SET status = $1, attempts = $2, error_message = $3, send_at = CURRENT_TIMESTAMP + interval '${delayMinutes} minutes', updated_at = CURRENT_TIMESTAMP 
       WHERE id = $4`,
        [newStatus, attempts, errorMessage, jobId],
      )
      .catch((e) =>
        logger.error(`[Queue DB] Erro ao falhar job ${jobId}: ${e.message}`),
      );
  }
}

export const messageQueue = new MessageQueueManager();
