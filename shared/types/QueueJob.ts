export type QueueJob = {
  sessionId: string; // ✨ Sincronizado com o tipo da fila principal
  jid: string;
  imagePath?: string;
  message: {
    text: string;
  };
};
