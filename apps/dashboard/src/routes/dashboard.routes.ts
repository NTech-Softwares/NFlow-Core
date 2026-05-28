import { Router } from "express";
import { DashboardController } from "../controllers/dashboard.controller";

const dashboardRoutes = Router();

dashboardRoutes.get("/", DashboardController.index);
dashboardRoutes.get("/teste", DashboardController.teste);
dashboardRoutes.get("/flows", DashboardController.flows);

dashboardRoutes.get("/login", DashboardController.login);

export default dashboardRoutes;
