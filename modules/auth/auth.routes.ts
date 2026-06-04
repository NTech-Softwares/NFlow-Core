import { Router } from "express";

import { me, login, register } from "./auth.controller";
import { authMiddleware } from "../../shared/middlewares/authMiddleware";

const router = Router();

router.get("/me", authMiddleware, me);
router.post("/login", login);
router.post("/register", register);

export default router;
