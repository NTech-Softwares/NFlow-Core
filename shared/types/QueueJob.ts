export type QueueJob = {
  jid: string;
  imagePath?: string;
  message: {
    text: string;
  };
};
