import { randomUUID } from "crypto"; // Nativo do Node.js (Evita dependências externas)
import { ScheduledMessage, ScheduleStatus } from "./schedule.types";
import * as scheduleRepository from "./schedule.repository";
import { CampaignTemplate, CampaignSchedule } from "./schedule.types";

interface CreateCampaignInput {
  userId: string;
  sessionId: string;
  name: string;
  text: string;
  mediaUrl?: string;
  mediaType?: "image" | "video" | "document";
  recipients: string[]; // JIDs que vão receber
  sendAtList: string[]; // Array de horários de disparo (ISO Strings)
}

interface CreateScheduleInput {
  userId: string;
  sessionId: string;
  remoteJid: string;
  text: string;
  scheduledAt: string; // ISO String format
  mediaUrl?: string;
  mediaType?: "image" | "video" | "document";
  maxRetries?: number;
}

/**
 * Cria e armazena um novo agendamento validando as regras de negócio.
 */
export async function createSchedule(
  input: CreateScheduleInput,
): Promise<ScheduledMessage> {
  const parsedDate = new Date(input.scheduledAt);

  // 1. Validação básica de data
  if (isNaN(parsedDate.getTime())) {
    throw new Error("A data de agendamento informada é inválida.");
  }

  if (parsedDate.getTime() < Date.now()) {
    throw new Error(
      "Não é possível criar um agendamento com data/hora no passado.",
    );
  }

  // 2. Monta o modelo de dados padronizado
  const newSchedule: ScheduledMessage = {
    id: randomUUID(),
    userId: input.userId,
    sessionId: input.sessionId,
    remoteJid: input.remoteJid,
    message: {
      text: input.text,
      mediaUrl: input.mediaUrl,
      mediaType: input.mediaType,
    },
    scheduledAt: parsedDate.toISOString(),
    status: "pending",
    retryCount: 0,
    maxRetries: input.maxRetries ?? 3,
    createdAt: new Date().toISOString(),
  };

  // 3. Persiste via repositório
  await scheduleRepository.addSchedule(input.userId, newSchedule);

  console.log(
    `[Service] Novo agendamento [${newSchedule.id}] criado com sucesso para o tenant: ${input.userId}`,
  );
  return newSchedule;
}

/**
 * Cancela um agendamento se ele ainda estiver pendente.
 */
export async function cancelSchedule(
  userId: string,
  scheduleId: string,
): Promise<boolean> {
  const schedules = await scheduleRepository.getSchedulesByTenant(userId);
  const schedule = schedules.find((s) => s.id === scheduleId);

  if (!schedule) {
    throw new Error("Agendamento não encontrado.");
  }

  if (schedule.status !== "pending") {
    throw new Error(
      `Não é possível cancelar um agendamento com status: ${schedule.status}`,
    );
  }

  await scheduleRepository.updateSchedule(userId, scheduleId, {
    status: "canceled",
  });
  console.log(
    `[Service] Agendamento [${scheduleId}] cancelado pelo tenant: ${userId}`,
  );
  return true;
}

/**
 * Lista os agendamentos de um tenant, permitindo filtragem opcional por status.
 */
export async function listSchedules(
  userId: string,
  status?: ScheduleStatus,
): Promise<ScheduledMessage[]> {
  const schedules = await scheduleRepository.getSchedulesByTenant(userId);

  if (status) {
    return schedules.filter((s) => s.status === status);
  }

  return schedules;
}

/**
 * Salva uma campanha como template e cria múltiplos agendamentos para ela.
 */
export async function createCampaign(
  input: CreateCampaignInput,
): Promise<void> {
  // 1. Cria o Template
  const templateId = randomUUID();
  const template: CampaignTemplate = {
    id: templateId,
    userId: input.userId,
    name: input.name,
    message: {
      text: input.text,
      mediaUrl: input.mediaUrl,
      mediaType: input.mediaType,
    },
    recipients: input.recipients,
  };

  await scheduleRepository.saveCampaignTemplate(template);

  // 2. Gera os horários agendados associados a este template
  const schedules: CampaignSchedule[] = input.sendAtList.map((time) => {
    const parsedDate = new Date(time);
    if (isNaN(parsedDate.getTime()) || parsedDate.getTime() < Date.now()) {
      throw new Error(
        `O horário de envio ${time} é inválido ou está no passado.`,
      );
    }

    return {
      id: randomUUID(),
      templateId: template.id,
      sessionId: input.sessionId,
      status: "pending",
      sendAt: parsedDate.toISOString(),
    };
  });

  if (schedules.length > 0) {
    await scheduleRepository.addCampaignSchedules(schedules);
  }

  console.log(
    `[Service] Campanha [${input.name}] criada com ${schedules.length} agendamentos para o tenant: ${input.userId}`,
  );
}
