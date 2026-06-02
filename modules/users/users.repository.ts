import fs from "fs/promises";
import path from "path";
import { BusinessHoursConfig } from "../../shared/utils/businessHours";

// Caminho absoluto para o seu arquivo de dados
const filePath = path.join(__dirname, "data", "users.json");

export interface UserDTO {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  whatsappSessionId: string;
  businessHours?: BusinessHoursConfig;
  createdAt: string;
}

/**
 * Lê todos os usuários do arquivo JSON
 */
export async function getUsers(): Promise<UserDTO[]> {
  try {
    const data = await fs.readFile(filePath, "utf-8");
    const parsed = JSON.parse(data);
    return parsed.usuarios || [];
  } catch (error) {
    // Se o arquivo não existir ou der erro, retorna array vazio
    return [];
  }
}

/**
 * Salva a lista de usuários atualizada de volta no JSON
 */
export async function saveUsers(users: UserDTO[]): Promise<void> {
  const payload = { usuarios: users };
  await fs.writeFile(filePath, JSON.stringify(payload, null, 2), "utf-8");
}

export async function getBusinessHoursByUserId(
  userId: string,
): Promise<BusinessHoursConfig | undefined> {
  const users = await getUsers();
  const user = users.find((u) => u.id === userId);
  return user?.businessHours;
}

/**
 * Atualiza os dados de perfil (incluindo horário de funcionamento) de um usuário específico
 */
export async function updateUserProfile(
  userId: string,
  profileData: Partial<Omit<UserDTO, "id" | "passwordHash" | "createdAt">>,
): Promise<UserDTO | undefined> {
  const users = await getUsers();
  const userIndex = users.findIndex((u) => u.id === userId);

  if (userIndex === -1) return undefined;

  // Mescla os dados antigos com as novas alterações enviadas pelo painel
  users[userIndex] = {
    ...users[userIndex],
    ...profileData,
    // Garante que se vier um objeto aninhado (como businessHours), ele seja mesclado ou substituído corretamente
    businessHours: profileData.businessHours
      ? profileData.businessHours
      : users[userIndex].businessHours,
  };

  await saveUsers(users);
  return users[userIndex];
}
