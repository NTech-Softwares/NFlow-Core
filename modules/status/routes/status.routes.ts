import { Router } from "express";

import { StatusController } from "../controllers/StatusController";
import { authMiddleware } from "../../../shared/middlewares/authMiddleware";

const statusRoutes = Router();

const statusController = new StatusController();

statusRoutes.get("/", authMiddleware, statusController.handle);

export { statusRoutes };
