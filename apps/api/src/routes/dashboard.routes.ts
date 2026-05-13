import { Router } from "express";
import { DashboardController } from "../controllers/dashboard.controller";

const dashboardRoutes = Router();

dashboardRoutes.get("/", DashboardController.index);
dashboardRoutes.get("/teste", DashboardController.teste);

export default dashboardRoutes;
