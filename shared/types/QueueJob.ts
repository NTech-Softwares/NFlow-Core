export type QueueJob = {
  id?: string | number; // Identificador opcional para controle persistente
  sessionId: string;
  jid: string;
  imagePath?: string;
  message: {
    text: string;
  };
  attempts?: number;
  userId?: string;
  scheduleId?: string;
};
