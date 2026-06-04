import { QueueJob } from "../types/QueueJob";
import { logger } from "../utils/logger";

class MessageQueueManager {
  private queue: QueueJob[] = [];

  /**
   * Adiciona um novo trabalho de envio de mensagem na fila
   */
  public push(job: QueueJob): void {
    if (job.attempts === undefined) job.attempts = 0;

    this.queue.push(job);
    logger.info(
      `[Queue] Novo job adicionado para ${job.jid}. Total na fila: ${this.queue.length}`,
    );
  }

  /**
   * Remove e retorna o primeiro elemento da fila (FIFO)
   */
  public shift(): QueueJob | undefined {
    return this.queue.shift();
  }

  /**
   * Retorna o tamanho atual de itens aguardando processamento
   */
  public size(): number {
    return this.queue.length;
  }
}

// Exporta como instância única e global (Singleton Pattern)
export const messageQueue = new MessageQueueManager();
