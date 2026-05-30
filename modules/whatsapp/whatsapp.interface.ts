export interface WhatsappStatusResponse {
  success: boolean;
  status: "CONNECTED" | "DISCONNECTED" | "INITIALIZING" | string;
  qr?: string | null;
}

export interface IWhatsappService {
  /**
   * Obtém o status da sessão em tempo real e inicializa sob demanda caso esteja offline.
   */
  getStatus(sessionId: string): Promise<WhatsappStatusResponse>;

  /**
   * Lista os grupos vinculados à sessão ativa do cliente.
   */
  listGroups(sessionId: string): Promise<any[]>;

  /**
   * Enfileira uma mensagem individual para disparo via worker.
   */
  sendIndividualMessage(
    sessionId: string,
    number: string,
    text: string,
    imagePath?: string,
  ): Promise<void>;

  /**
   * Enfileira disparos em massa para múltiplos grupos do WhatsApp.
   */
  sendGroupCampaign(
    sessionId: string,
    groups: string | string[],
    text: string,
    imagePath?: string,
  ): Promise<number>;

  /**
   * Varre o banco/repositório e inicializa todas as sessões ativas no boot da aplicação.
   */
  initAllSavedSessions(): Promise<void>;
}
