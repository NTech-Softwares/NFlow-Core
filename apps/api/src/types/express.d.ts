// apps/api/src/types/express.d.ts
declare global {
  namespace Express {
    interface Request {
      user: {
        id: string;
        email: string;
        whatsappSessionId: string;
        sessionId?: string; // compatibilidade com código legado
        [key: string]: any;
      };
    }
  }
}
export {};
