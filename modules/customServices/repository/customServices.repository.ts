import fs from "fs/promises";
import path from "path";
import {
  CustomServicesConfig,
  Appointment,
} from "../domain/customServices.types";

const CONFIG_DIR = path.join(
  process.cwd(),
  "storage",
  "customServices",
  "configs",
);
const APPOINTMENTS_DIR = path.join(
  process.cwd(),
  "storage",
  "customServices",
  "appointments",
);

async function ensureDirs() {
  await fs.mkdir(CONFIG_DIR, { recursive: true });
  await fs.mkdir(APPOINTMENTS_DIR, { recursive: true });
}

export async function getConfigByTenant(
  userId: string,
): Promise<CustomServicesConfig | null> {
  await ensureDirs();
  const filePath = path.join(CONFIG_DIR, `${userId.toLowerCase()}.json`);
  try {
    const data = await fs.readFile(filePath, "utf-8");
    return JSON.parse(data) as CustomServicesConfig;
  } catch (error: any) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

export async function saveConfigByTenant(
  userId: string,
  config: CustomServicesConfig,
): Promise<void> {
  await ensureDirs();
  const filePath = path.join(CONFIG_DIR, `${userId.toLowerCase()}.json`);
  await fs.writeFile(filePath, JSON.stringify(config, null, 2), "utf-8");
}

export async function getAppointmentsByTenant(
  userId: string,
): Promise<Appointment[]> {
  await ensureDirs();
  const filePath = path.join(APPOINTMENTS_DIR, `${userId.toLowerCase()}.json`);
  try {
    const data = await fs.readFile(filePath, "utf-8");
    return JSON.parse(data) as Appointment[];
  } catch (error: any) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

export async function saveAppointmentsByTenant(
  userId: string,
  appointments: Appointment[],
): Promise<void> {
  await ensureDirs();
  const filePath = path.join(APPOINTMENTS_DIR, `${userId.toLowerCase()}.json`);
  await fs.writeFile(filePath, JSON.stringify(appointments, null, 2), "utf-8");
}
