import { Router } from "express";
import { authMiddleware } from "../../../../shared/middlewares/authMiddleware";
import {
  getFlows,
  getFlowById,
  getFlowsTree,
  addFlow,
  removeFlow,
  addStep,
  removeStep,
  updateStepMessage,
  updateStepOptions,
} from "../controllers/flows.controller";

const router = Router();

/*
 =========================
 FLOWS
 =========================
*/

// LISTA TODOS OS FLOWS
router.get("/", authMiddleware, getFlows);

// ESTRUTURA SIMPLIFICADA
router.get("/tree", authMiddleware, getFlowsTree);

// GERENCIAMENTO DE FLUXOS
router.post("/addflow", authMiddleware, addFlow);
router.post("/removeFlow", authMiddleware, removeFlow);

// GERENCIAMENTO DE PASSOS (STEPS)
router.post("/add-step", authMiddleware, addStep);
router.post("/remove-step", authMiddleware, removeStep);

// ATUALIZAÇÃO DE CONTEÚDO DOS PASSOS
router.post("/update-message", authMiddleware, updateStepMessage);
router.post("/update-options", authMiddleware, updateStepOptions);

// FLOW ESPECÍFICO
router.get("/:flowId", authMiddleware, getFlowById);

export default router;
