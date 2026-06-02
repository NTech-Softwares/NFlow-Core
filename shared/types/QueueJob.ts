export type QueueJob = {
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
