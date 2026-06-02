import { Router } from "express";
import { AttendanceController } from "../controllers/attendance.controller";
import { authMiddleware } from "../../../../shared/middlewares/authMiddleware";

const attendanceRoutes = Router();
const attendanceController = new AttendanceController();

attendanceRoutes.use(authMiddleware);

// GET /attendance/sessions -> Lista as abas de chat humano
attendanceRoutes.get("/sessions", attendanceController.listSessions);

// POST /attendance/status   -> Botão: "Mover/Aceitar em Atendimento"
attendanceRoutes.post("/status", attendanceController.updateStatus);

// POST /attendance/close    -> Botão: "Voltar para o Bot / Encerrar"
attendanceRoutes.post("/close", attendanceController.closeAttendance);

// 🟢 NOVO: POST /attendance/delete   -> Botão: "Excluir Atendimento"
attendanceRoutes.post("/delete", attendanceController.deleteAttendance);

export { attendanceRoutes };
