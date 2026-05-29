import fs from "fs/promises";
import path from "path";

// Caminho absoluto para o seu arquivo de dados
const filePath = path.join(__dirname, "data", "users.json");

export interface UserDTO {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  whatsappSessionId: string;
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
