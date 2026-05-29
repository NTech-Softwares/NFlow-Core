import { Router } from "express";
import { DashboardController } from "../controllers/dashboard.controller";

const dashboardRoutes = Router();

dashboardRoutes.get("/", DashboardController.index);
dashboardRoutes.get("/criar-flow", DashboardController.wizard);
dashboardRoutes.get("/qr", DashboardController.qrCode);
dashboardRoutes.get("/flows", DashboardController.flows);

dashboardRoutes.get("/login", DashboardController.login);
dashboardRoutes.get("/register", DashboardController.register);

export default dashboardRoutes;
