import { Router } from "express";

import { authMiddleware } from "../../../../shared/middlewares/authMiddleware";

import {
  getFlows,
  getFlowById,
  getFlowsTree,
} from "../controllers/flows.controller";

const router = Router();

/*
 =========================
 FLOWS
 =========================
*/

/*
 LISTA TODOS OS FLOWS
*/
router.get("/", authMiddleware, getFlows);

/*
 ESTRUTURA SIMPLIFICADA
*/
router.get("/tree", authMiddleware, getFlowsTree);

/*
 FLOW ESPECÍFICO
*/
router.get("/:flowId", authMiddleware, getFlowById);

export default router;
