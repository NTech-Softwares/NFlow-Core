import fs from "fs/promises";
import path from "path";
import { ScheduledMessage, ScheduleStatus } from "./schedule.types";

// Define dinamicamente o caminho absoluto com base na raiz do projeto (C:\My Codes\NFlow Core\storage\schedules)
const STORAGE_DIR = path.join(process.cwd(), "storage", "schedules");

/**
 * Garante que a pasta de armazenamento exista de forma assíncrona.
 */
async function ensureDirectoryExists(): Promise<void> {
  await fs.mkdir(STORAGE_DIR, { recursive: true });
}

/**
 * Retorna o caminho do arquivo JSON de um tenant específico.
 */
function getTenantFilePath(userId: string): string {
  return path.join(STORAGE_DIR, `${userId.trim().toLowerCase()}.json`);
}

/**
 * Recupera todos os agendamentos de um Tenant específico.
 */
export async function getSchedulesByTenant(
  userId: string,
): Promise<ScheduledMessage[]> {
  await ensureDirectoryExists();
  const filePath = getTenantFilePath(userId);

  try {
    const data = await fs.readFile(filePath, "utf-8");
    return JSON.parse(data) as ScheduledMessage[];
  } catch (error: any) {
    // Se o arquivo não existir (ENOENT), retorna um array vazio sem estourar erro
    if (error.code === "ENOENT") {
      return [];
    }
    console.error(
      `[Repository] Erro ao ler agendamentos do tenant ${userId}:`,
      error,
    );
    throw error;
  }
}

/**
 * Salva a lista completa de agendamentos de um Tenant específico.
 */
export async function saveSchedulesByTenant(
  userId: string,
  schedules: ScheduledMessage[],
): Promise<void> {
  await ensureDirectoryExists();
  const filePath = getTenantFilePath(userId);

  try {
    await fs.writeFile(filePath, JSON.stringify(schedules, null, 2), "utf-8");
  } catch (error) {
    console.error(
      `[Repository] Erro ao salvar agendamentos do tenant ${userId}:`,
      error,
    );
    throw error;
  }
}

/**
 * Adiciona um único agendamento à lista do Tenant.
 */
export async function addSchedule(
  userId: string,
  newSchedule: ScheduledMessage,
): Promise<void> {
  const schedules = await getSchedulesByTenant(userId);
  schedules.push(newSchedule);
  await saveSchedulesByTenant(userId, schedules);
}

/**
 * Atualiza o status e/ou propriedades de um agendamento específico de um Tenant.
 */
export async function updateSchedule(
  userId: string,
  scheduleId: string,
  updates: Partial<ScheduledMessage>,
): Promise<void> {
  const schedules = await getSchedulesByTenant(userId);
  const index = schedules.findIndex((s) => s.id === scheduleId);

  if (index !== -1) {
    schedules[index] = { ...schedules[index], ...updates };
    await saveSchedulesByTenant(userId, schedules);
  }
}

/**
 * 🗑️ NOVO: Remove fisicamente um agendamento do arquivo JSON do Tenant.
 */
export async function deleteSchedule(
  userId: string,
  scheduleId: string,
): Promise<void> {
  const schedules = await getSchedulesByTenant(userId);
  const updatedSchedules = schedules.filter((s) => s.id !== scheduleId);

  // Só reescreve se realmente removeu algo do array (otimização de I/O)
  if (schedules.length !== updatedSchedules.length) {
    await saveSchedulesByTenant(userId, updatedSchedules);
  }
}

/**
 * 🛠️ MÉTODO PARA O WORKER: Varre todos os arquivos da pasta 'schedules'
 * e agrupa todos os agendamentos que estão com status 'pending'.
 */
export async function getAllPendingSchedules(): Promise<ScheduledMessage[]> {
  return getAllSchedulesByStatus("pending");
}

/**
 * 🛠️ NOVO MÉTODO PARA O WORKER: Varre todos os arquivos da pasta 'schedules'
 * e agrupa todas as mensagens marcadas como 'canceled' para a rotina de faxina.
 */
export async function getAllCanceledSchedules(): Promise<ScheduledMessage[]> {
  return getAllSchedulesByStatus("canceled" as ScheduleStatus);
}

/**
 * 🧬 FUNÇÃO INTERNA AUXILIAR: Centraliza o scanner de diretório por status
 * para evitar duplicação idêntica de código pesado de I/O.
 */
async function getAllSchedulesByStatus(
  status: ScheduleStatus,
): Promise<ScheduledMessage[]> {
  await ensureDirectoryExists();
  const filteredSchedules: ScheduledMessage[] = [];

  try {
    const files = await fs.readdir(STORAGE_DIR);
    const jsonFiles = files.filter((file) => file.endsWith(".json"));

    for (const file of jsonFiles) {
      const filePath = path.join(STORAGE_DIR, file);
      const data = await fs.readFile(filePath, "utf-8");
      const schedules = JSON.parse(data) as ScheduledMessage[];

      const matched = schedules.filter((s) => s.status === status);
      filteredSchedules.push(...matched);
    }
  } catch (error) {
    console.error(
      `[Repository] Erro ao escanear agendamentos globais com status '${status}':`,
      error,
    );
  }

  return filteredSchedules;
}
