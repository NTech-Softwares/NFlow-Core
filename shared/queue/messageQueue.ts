type QueueMessage = {
  sessionId: string; // ✨ Adicionado para identificar de qual cliente é o disparo
  jid: string;
  imagePath?: string;
  message: {
    text: string;
  };
};

export const messageQueue: QueueMessage[] = [];
