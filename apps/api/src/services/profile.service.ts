import { UserService } from "../../../../modules/users/users.service";
import { BusinessHoursConfig } from "../../../../shared/utils/businessHours";

const userService = new UserService();

export async function getProfile(userId: string) {
  return await userService.getUserProfile(userId);
}

export async function updateProfileData(
  userId: string,
  data: {
    businessHours?: BusinessHoursConfig;
    companyName?: string;
    businessType?: string;
    address?: string;
  },
) {
  return await userService.updateProfileData(userId, data);
}
