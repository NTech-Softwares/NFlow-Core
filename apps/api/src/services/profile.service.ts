import { UserService } from "../../../../modules/users/users.service";
import { BusinessHoursConfig } from "../../../../shared/utils/businessHours";

// Instancia o Core Domain Service interno
const userService = new UserService();

/**
 * Busca o perfil do inquilino atual na API Gateway
 */
export async function getProfile(userId: string) {
  return await userService.getUserProfile(userId);
}

/**
 * Atualiza os horários de funcionamento do inquilino na API Gateway
 */
export async function updateBusinessHours(
  userId: string,
  businessHours: BusinessHoursConfig,
) {
  return await userService.updateBusinessHours(userId, businessHours);
}
