import * as coreRepository from "../../../../modules/customServices/repository/customServices.repository";
import * as coreService from "../../../../modules/customServices/services/customServices.service";
import {
  CustomServiceItem,
  Appointment,
  CustomServicesConfig,
} from "../../../../modules/customServices/domain/customServices.types";

export class ApiCustomServicesService {
  // Retorna a configuração completa para alimentar as telas do painel
  static async getConfig(userId: string): Promise<CustomServicesConfig | null> {
    return await coreRepository.getConfigByTenant(userId);
  }

  static async saveConfig(
    userId: string,
    params: {
      services: CustomServiceItem[];
      maxSimultaneousSlots: number;
      confirmationMessage?: string;
    },
  ): Promise<CustomServicesConfig> {
    // Mapeia explicitamente os novos campos de mensagem customizada por serviço para evitar vazamento ou payloads inválidos
    const mappedServices: CustomServiceItem[] = (params.services || []).map(
      (service) => ({
        id: service.id,
        name: service.name,
        price: Number(service.price) || 0,
        durationMinutes: Number(service.durationMinutes) || 60,
        strategyType: service.strategyType || "STANDARD",
        courseMetadata:
          service.strategyType === "RECURRENT_COURSE"
            ? service.courseMetadata
            : null,
        // 🔥 GARANTE O MAPEAMENTO DOS NOVOS CAMPOS NA GRAVAÇÃO DO JSON
        useCustomMessage: !!service.useCustomMessage,
        customConfirmationMessage:
          service.customConfirmationMessage?.trim() || "",
      }),
    );

    // 🔥 Monta o payload respeitando estritamente a nova estrutura de dados limpa
    const updatedConfig: CustomServicesConfig = {
      userId,
      services: mappedServices,
      maxSimultaneousSlots: Number(params.maxSimultaneousSlots) || 1,
      confirmationMessage: params.confirmationMessage?.trim() || undefined,
    };

    await coreRepository.saveConfigByTenant(userId, updatedConfig);
    return updatedConfig;
  }

  static async listAppointments(userId: string): Promise<Appointment[]> {
    return await coreRepository.getAppointmentsByTenant(userId);
  }

  static async cancelAppointment(
    userId: string,
    appointmentId: string,
  ): Promise<boolean> {
    return await coreService.removeAppointmentAndReminders(
      userId,
      appointmentId,
    );
  }
}
