import { Router } from "express";

import { authMiddleware } from "../../../../shared/middlewares/authMiddleware";

import {
  getFlows,
  getFlowById,
  getFlowsTree,
  addFlow,
  removeFlow,
  updateStepMessage,
} from "../controllers/flows.controller";

const router = Router();

/*
 =========================
 FLOWS
 =========================
*/

//LISTA TODOS OS FLOWS
router.get("/", authMiddleware, getFlows);

//ESTRUTURA SIMPLIFICADA
router.get("/tree", authMiddleware, getFlowsTree);

router.post("/addflow", authMiddleware, addFlow);
router.post("/removeFlow", authMiddleware, removeFlow);

router.post("/update-message", authMiddleware, updateStepMessage);

//FLOW ESPECÍFICO
router.get("/:flowId", authMiddleware, getFlowById);

export default router;
