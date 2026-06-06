import { Router } from "express";
import { MainController } from "../controllers/main.controller";

const mainRoutes = Router();

mainRoutes.get("/", MainController.index);
mainRoutes.get("/criar-flow", MainController.wizard);
mainRoutes.get("/qr", MainController.qrCode);

mainRoutes.get("/login", MainController.login);
mainRoutes.get("/register", MainController.register);
mainRoutes.get("/forgot-password", MainController.forgotPassword);
mainRoutes.get("/reset-password", MainController.resetPassword);

export default mainRoutes;
