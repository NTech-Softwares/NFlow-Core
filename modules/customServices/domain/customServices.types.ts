export type SchedulingStrategyType = "STANDARD" | "RECURRENT_COURSE";

export interface RecurrentCourseMetadata {
  totalClasses: number;
  allowedDaysOfWeek: number[];
  maxStudentsPerSlot: number;
  customHours?: {
    open: string;
    close: string;
  };
}

export interface CustomServiceItem {
  id: string;
  name: string;
  price: number;
  durationMinutes: number;
  strategyType?: SchedulingStrategyType;
  courseMetadata?: RecurrentCourseMetadata;
  useCustomMessage?: boolean;
  customConfirmationMessage?: string;
}

export interface CustomServicesConfig {
  userId: string;
  services: CustomServiceItem[];
  maxSimultaneousSlots: number;
  confirmationMessage?: string;
}

export interface Appointment {
  id: string;
  userId: string;
  sessionId: string;
  remoteJid: string;
  clientName: string;
  service: CustomServiceItem;
  serviceId: string;
  date: string;
  time: string;
  createdAt: string;
  remindersScheduled: {
    twentyFourHours?: string | null;
    oneHour?: string;
  };
  parentId?: string;
  classIndex?: number;
}
