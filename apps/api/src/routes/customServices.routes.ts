import { Router } from "express";
import { CustomServicesController } from "../controllers/customServices.controller";
import { authMiddleware } from "../../../../shared/middlewares/authMiddleware";

const customServicesRoutes = Router();
const controller = new CustomServicesController();

customServicesRoutes.use(authMiddleware);

// Endpoints do Catálogo de Serviços
customServicesRoutes.get("/services", controller.getServices);
customServicesRoutes.post("/services", controller.saveServices);

// Endpoints da Agenda de Clientes Confirmados
customServicesRoutes.get("/appointments", controller.listAppointments);
customServicesRoutes.delete("/appointments/:appointmentId", controller.deleteAppointment);

export { customServicesRoutes };