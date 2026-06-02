import { Router } from "express";
import { SchedulerController } from "../controllers/schedule.controller";
import { authMiddleware } from "../../../../shared/middlewares/authMiddleware";

const schedulerRoutes = Router();
const schedulerController = new SchedulerController();

// Aplica a proteção do Token em todas as rotas do submódulo de agendamentos
schedulerRoutes.use(authMiddleware);

// POST /schedules
schedulerRoutes.post("/", schedulerController.create);

// GET /schedules
schedulerRoutes.get("/", schedulerController.list);

// DELETE /schedules/:scheduleId (Removido o /:userId daqui)
schedulerRoutes.delete("/:scheduleId", schedulerController.delete);

export { schedulerRoutes };
