import { randomUUID } from "crypto";
import * as repo from "../repository/customServices.repository";
import {
  createSchedule,
  cancelSchedule,
} from "../../scheduler/schedule.service";
import { UserService } from "../../users/users.service";
import { Appointment, CustomServiceItem } from "../domain/customServices.types";
import { logger } from "../../../shared/utils/logger";

const userService = new UserService();

export async function getAvailableDaysForBot(
  userId: string,
  selectedService?: CustomServiceItem,
): Promise<{ dateStr: string; label: string }[]> {
  const profile = await userService.getUserProfile(userId).catch(() => null);

  if (!profile || !profile.businessHours) return [];

  let allowedDaysOfWeek: number[] = [];
  const isCourse = selectedService?.strategyType === "RECURRENT_COURSE";

  if (isCourse && selectedService.courseMetadata?.allowedDaysOfWeek) {
    allowedDaysOfWeek =
      selectedService.courseMetadata.allowedDaysOfWeek.map(Number);
  } else {
    if (!profile.businessHours.enabled || !profile.businessHours.schedule)
      return [];
    const schedule = profile.businessHours.schedule;
    allowedDaysOfWeek = Object.keys(schedule)
      .filter((dayKey) => schedule[dayKey] && schedule[dayKey].length > 0)
      .map((dayKey) => parseInt(dayKey));
  }

  const days: { dateStr: string; label: string }[] = [];
  const now = new Date();

  const maxDaysAhead = isCourse ? 7 : 14;

  for (let i = 0; i < maxDaysAhead; i++) {
    const futureDate = new Date();
    futureDate.setDate(now.getDate() + i);
    const dayOfWeek = futureDate.getDay();

    if (allowedDaysOfWeek.includes(dayOfWeek)) {
      const yyyy = futureDate.getFullYear();
      const mm = String(futureDate.getMonth() + 1).padStart(2, "0");
      const dd = String(futureDate.getDate()).padStart(2, "0");
      const dateStr = `${yyyy}-${mm}-${dd}`;

      const label = futureDate.toLocaleDateString("pt-BR", {
        weekday: "long",
        day: "numeric",
        month: "short",
      });

      days.push({ dateStr, label });
    }
  }
  return days;
}

export async function getAvailableHoursForBot(
  userId: string,
  dateStr: string,
  selectedService?: CustomServiceItem,
): Promise<string[]> {
  const profile = await userService.getUserProfile(userId).catch(() => null);
  const config = await repo.getConfigByTenant(userId);

  if (!profile || !config) return [];

  const parsedDate = new Date(`${dateStr}T00:00:00`);
  const dayOfWeek = parsedDate.getDay();

  if (
    selectedService?.strategyType === "RECURRENT_COURSE" &&
    selectedService.courseMetadata
  ) {
    const allowed = (
      selectedService.courseMetadata.allowedDaysOfWeek || []
    ).map(Number);
    if (allowed.length > 0 && !allowed.includes(dayOfWeek)) {
      return [];
    }
  }

  let intervals: { open: string; close: string }[] = [];

  if (
    selectedService?.strategyType === "RECURRENT_COURSE" &&
    selectedService.courseMetadata?.customHours?.open &&
    selectedService.courseMetadata?.customHours?.close
  ) {
    intervals = [
      {
        open: selectedService.courseMetadata.customHours.open,
        close: selectedService.courseMetadata.customHours.close,
      },
    ];
  } else {
    if (!profile.businessHours?.schedule) return [];
    intervals = profile.businessHours.schedule[dayOfWeek.toString()] || [];
  }

  if (intervals.length === 0) return [];

  const toMins = (timeStr: string) => {
    const [h, m] = timeStr.split(":").map(Number);
    return h * 60 + (m || 0);
  };

  const toTimeStr = (totalMins: number) => {
    const h = Math.floor(totalMins / 60);
    const m = totalMins % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  };

  const slotsSet = new Set<string>();
  const now = new Date();
  const isToday =
    dateStr ===
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const currentMinsNow = now.getHours() * 60 + now.getMinutes();

  const durationOfSelected = selectedService?.durationMinutes || 60;
  const isCourse = selectedService?.strategyType === "RECURRENT_COURSE";

  for (const interval of intervals) {
    if (!interval.open || !interval.close) continue;

    const startMins = toMins(interval.open);
    const endMins = toMins(interval.close);

    let currentMins = startMins;

    if (isCourse) {
      while (currentMins + durationOfSelected <= endMins) {
        if (!isToday || currentMins > currentMinsNow) {
          slotsSet.add(toTimeStr(currentMins));
        }
        currentMins += durationOfSelected;
      }
    } else {
      while (currentMins < endMins) {
        if (!isToday || currentMins > currentMinsNow) {
          slotsSet.add(toTimeStr(currentMins));
        }
        currentMins += 60;
      }
    }
  }

  const allSlots = Array.from(slotsSet).sort((a, b) => a.localeCompare(b));

  const appointments = await repo.getAppointmentsByTenant(userId);
  const dayAppointments = appointments.filter((app) => app.date === dateStr);

  return allSlots.filter((slot) => {
    const slotStartMins = toMins(slot);
    const slotEndMins = slotStartMins + durationOfSelected;

    let overlappingCount = 0;

    for (const app of dayAppointments) {
      const appDuration = app.service?.durationMinutes || 60;
      const appStartMins = toMins(app.time);
      const appEndMins = appStartMins + appDuration;

      if (slotStartMins < appEndMins && slotEndMins > appStartMins) {
        if (isCourse) {
          const currentAppServiceId = app.serviceId || app.service?.id;
          if (currentAppServiceId === selectedService?.id) {
            overlappingCount++;
          }
        } else {
          const appStrategy = app.service?.strategyType || "STANDARD";
          if (appStrategy === "STANDARD") {
            overlappingCount++;
          }
        }
      }
    }

    if (isCourse) {
      const courseMax =
        selectedService?.courseMetadata?.maxStudentsPerSlot || 1;
      return overlappingCount < courseMax;
    } else {
      const maxSimultaneous = config.maxSimultaneousSlots || 1;
      return overlappingCount < maxSimultaneous;
    }
  });
}

export async function executeBooking(params: {
  userId: string;
  sessionId: string;
  remoteJid: string;
  clientName: string;
  service: CustomServiceItem;
  dates: string[];
  time: string;
}): Promise<Appointment> {
  const { userId, sessionId, remoteJid, clientName, service, dates, time } =
    params;

  if (service.strategyType !== "RECURRENT_COURSE" || !service.courseMetadata) {
    const app = await createSingleAppointmentRecord(
      { ...params, date: dates[0] },
      undefined,
      undefined,
    );
    await repo.insertAppointment(app);
    return app;
  }

  const meta = service.courseMetadata;
  const totalClasses = meta.totalClasses || 1;

  let classesScheduled = 0;
  const parentId = randomUUID();
  let primeAppointment: Appointment | null = null;

  const targetDaysOfWeek = dates.map((dStr) =>
    new Date(`${dStr}T00:00:00`).getDay(),
  );
  let pivotDate = new Date(`${dates[0]}T00:00:00`);

  while (classesScheduled < totalClasses) {
    const currentDayOfWeek = pivotDate.getDay();

    if (targetDaysOfWeek.includes(currentDayOfWeek)) {
      const yyyy = pivotDate.getFullYear();
      const mm = String(pivotDate.getMonth() + 1).padStart(2, "0");
      const dd = String(pivotDate.getDate()).padStart(2, "0");
      const currentDateStr = `${yyyy}-${mm}-${dd}`;

      classesScheduled++;

      const appInstance = await createSingleAppointmentRecord(
        {
          userId,
          sessionId,
          remoteJid,
          clientName,
          service,
          date: currentDateStr,
          time,
        },
        parentId,
        classesScheduled,
      );

      await repo.insertAppointment(appInstance);

      if (classesScheduled === 1) primeAppointment = appInstance;
    }
    pivotDate.setDate(pivotDate.getDate() + 1);
  }

  return primeAppointment!;
}

async function createSingleAppointmentRecord(
  params: {
    userId: string;
    sessionId: string;
    remoteJid: string;
    clientName: string;
    service: CustomServiceItem;
    date: string;
    time: string;
  },
  parentId?: string,
  classIndex?: number,
): Promise<Appointment> {
  const { userId, sessionId, remoteJid, clientName, service, date, time } =
    params;

  const appointmentDateTime = new Date(`${date}T${time}:00`);
  const now = new Date();
  const diffInHours =
    (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

  // 🌟 CORREÇÃO CRÍTICA: ID agora é SEMPRE um UUID legítimo e puro para satisfazer o tipo UUID do Postgres
  const appointmentId = randomUUID();
  const reminders: { twentyFourHours?: string | null; oneHour?: string } = {};

  let suffix = classIndex ? ` (Aula ${classIndex})` : "";
  const serviceLabel = `*${service.name}${suffix}*`;
  const dateFormatted = appointmentDateTime.toLocaleDateString("pt-BR");

  if (diffInHours >= 24) {
    const target24h = new Date(
      appointmentDateTime.getTime() - 24 * 60 * 60 * 1000,
    );
    const schedule24 = await createSchedule({
      userId,
      sessionId,
      remoteJid,
      text: `Olá, ${clientName}! Passando para lembrar de seu compromisso para ${serviceLabel} amanhã, dia ${dateFormatted} às ${time}. 🚀`,
      scheduledAt: target24h.toISOString(),
    });
    reminders.twentyFourHours = schedule24.id;
  } else {
    reminders.twentyFourHours = null;
  }

  if (diffInHours >= 1) {
    const target1h = new Date(
      appointmentDateTime.getTime() - 1 * 60 * 60 * 1000,
    );
    const schedule1 = await createSchedule({
      userId,
      sessionId,
      remoteJid,
      text: `Ei, ${clientName}! Falta apenas 1 hora para ${serviceLabel} hoje às ${time}. Te aguardamos! ⏳`,
      scheduledAt: target1h.toISOString(),
    });
    reminders.oneHour = schedule1.id;
  }

  return {
    id: appointmentId,
    userId,
    sessionId,
    remoteJid,
    clientName,
    service,
    serviceId: service.id,
    date,
    time,
    createdAt: new Date().toISOString(),
    remindersScheduled: reminders,
    parentId,
    classIndex,
  };
}

export async function removeAppointmentAndReminders(
  userId: string,
  appointmentId: string,
): Promise<boolean> {
  const appointments = await repo.getAppointmentsByTenant(userId);
  const target = appointments.find((app) => app.id === appointmentId);

  if (!target) {
    throw new Error("Agendamento não encontrado.");
  }

  const itemsToRemove = target.parentId
    ? appointments.filter((app) => app.parentId === target.parentId)
    : [target];

  for (const app of itemsToRemove) {
    if (app.remindersScheduled) {
      const { twentyFourHours, oneHour } = app.remindersScheduled;
      if (twentyFourHours)
        await cancelSchedule(userId, twentyFourHours).catch(() => null);
      if (oneHour) await cancelSchedule(userId, oneHour).catch(() => null);
    }

    await repo.deleteAppointment(userId, app.id);
  }

  return true;
}
