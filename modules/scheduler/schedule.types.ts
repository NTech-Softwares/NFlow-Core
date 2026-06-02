export type ScheduleStatus = "pending" | "sent" | "failed" | "canceled";

export interface ScheduledMessage {
  id: string; // UUID ou ID único do agendamento
  userId: string; // ID do Tenant/Inquilino dono do agendamento (ex: suzana)
  sessionId: string; // ID da sessão do WhatsApp de disparo (ex: suzana_session)
  remoteJid: string; // Número do destinatário do WhatsApp (ex: 5511999999999@s.whatsapp.net)

  // Estrutura de mensagem preparada para evoluir além de texto simples (mídia, botões, etc.)
  message: {
    text: string;
    mediaUrl?: string;
    mediaType?: "image" | "video" | "document";
  };

  scheduledAt: string; // Data/Hora planejada para o envio (ISO 8601: YYYY-MM-DDTHH:mm:ss.sssZ)
  status: ScheduleStatus; // Estado atual na fila de processamento

  // Mecanismo de resiliência (Evita travar o bot por instabilidade da rede)
  retryCount: number; // Tentativas já realizadas (Inicia em 0)
  maxRetries: number; // Limite máximo de tentativas (Padrão: 3)
  error?: string; // Guarda o motivo da falha caso o status mude para 'failed'

  // Timestamps de Auditoria
  createdAt: string; // Data de criação do agendamento
  sentAt?: string; // Data exata em que o Baileys confirmou o envio
}
