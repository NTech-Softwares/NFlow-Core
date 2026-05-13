import { Router } from "express";

import { authMiddleware } from "../../../../shared/middlewares/authMiddleware";

import { upload } from "../../../../shared/middlewares/upload";

import {
  getStatus,
  listGroups,
  sendMessage,
  sendCampaign,
} from "../controllers/whatsapp.controller";

const router = Router();

/*
 =========================
 STATUS
 =========================
*/
router.get("/status", authMiddleware, getStatus);

/*
 =========================
 LISTAR GRUPOS
 =========================
*/
router.get("/list-groups", authMiddleware, listGroups);

/*
 =========================
 ENVIAR MENSAGEM
 =========================
*/
router.post(
  "/send-message",
  authMiddleware,
  upload.single("image"),
  sendMessage,
);

/*
 =========================
 ENVIAR CAMPANHA
 =========================
*/
router.post(
  "/send-campaign",
  authMiddleware,
  upload.single("image"),
  sendCampaign,
);

export default router;
