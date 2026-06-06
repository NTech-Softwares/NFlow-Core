import { Router } from "express";
import { authMiddleware } from "../../../../shared/middlewares/authMiddleware";
import { ProfileController } from "../controllers/profile.controller";

const profileRoutes = Router();
const profileController = new ProfileController();

profileRoutes.use(authMiddleware);

profileRoutes.get("/", profileController.show);

profileRoutes.put("/business-hours", profileController.updateProfile);

export { profileRoutes };
