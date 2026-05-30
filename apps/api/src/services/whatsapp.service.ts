// apps/api/src/services/whatsapp.service.ts
import { WhatsappService as CoreWhatsappService } from "../../../../modules/whatsapp/whatsapp.service";

/**
 * Este serviço atua como uma ponte (Bridge) entre a API Gateway e o Módulo Core.
 * Isso mantém o Controller limpo e permite que, no futuro, você altere
 * a implementação sem tocar nos controllers.
 */
export const whatsappService = new CoreWhatsappService();
