import * as coreScheduleService from "../../../../modules/scheduler/schedule.service";
import { ScheduledMessage } from "../../../../modules/scheduler/schedule.types";

export class ApiSchedulerService {
  /**
   * Encaminha a criação do agendamento 1:1 para o módulo core
   */
  static async add(data: {
    userId: string;
    sessionId: string;
    remoteJid: string;
    text: string;
    scheduledAt: string;
    mediaUrl?: string;
  }): Promise<ScheduledMessage> {
    return await coreScheduleService.createSchedule({
      userId: data.userId,
      sessionId: data.sessionId,
      remoteJid: data.remoteJid,
      text: data.text,
      scheduledAt: data.scheduledAt,
      mediaUrl: data.mediaUrl,
    });
  }

  /**
   * Encaminha a criação de uma Campanha (1:N) para o módulo core
   */
  static async addCampaign(data: {
    userId: string;
    sessionId: string;
    name: string;
    text: string;
    mediaUrl?: string;
    recipients: string[];
    sendAtList: string[];
  }): Promise<void> {
    return await coreScheduleService.createCampaign({
      userId: data.userId,
      sessionId: data.sessionId,
      name: data.name,
      text: data.text,
      mediaUrl: data.mediaUrl,
      recipients: data.recipients,
      sendAtList: data.sendAtList,
    });
  }

  /**
   * Encaminha o cancelamento do agendamento para o módulo core
   */
  static async remove(userId: string, scheduleId: string): Promise<boolean> {
    return await coreScheduleService.cancelSchedule(userId, scheduleId);
  }

  static async list(userId: string): Promise<ScheduledMessage[]> {
    return await coreScheduleService.listSchedules(userId);
  }
}
