import * as coreAttendanceService from "../../../../modules/attendance/attendance.service";

export class ApiAttendanceService {
  static async getSessionsInHumanAttendance(sessionId: string) {
    return await coreAttendanceService.listHumanAttendanceSessions(sessionId);
  }

  static async updateStatus(data: {
    sessionId: string;
    remoteJid: string;
    status: "em_espera" | "em_atendimento";
  }) {
    // 🟢 CORRIGIDO: Removido o data.userId que estava deslocando os argumentos do Core
    return await coreAttendanceService.changeAttendanceStatus(
      data.sessionId,
      data.remoteJid,
      data.status,
    );
  }

  static async closeAndRouteToBot(data: {
    sessionId: string;
    remoteJid: string;
  }) {
    // 🟢 CORRIGIDO: Removido o data.userId que estava deslocando os argumentos do Core
    return await coreAttendanceService.resetToBotAutomation(
      data.sessionId,
      data.remoteJid,
    );
  }

  /**
   * 🟢 NOVO: Encaminha a exclusão completa do chat para o módulo core
   */
  static async deleteAttendance(data: {
    sessionId: string;
    remoteJid: string;
  }) {
    return await coreAttendanceService.clearAttendanceSession(
      data.sessionId,
      data.remoteJid,
    );
  }

  /**
   * 🟢 NOVO: Atalho estático para o gatilho automático de envio de mensagem manual
   */
  static async triggerOperatorMessageHook(
    sessionId: string,
    remoteJid: string,
  ) {
    return await coreAttendanceService.autoAdvanceOnOperatorMessage(
      sessionId,
      remoteJid,
    );
  }
}
