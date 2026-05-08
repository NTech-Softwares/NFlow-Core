import { Router } from "express";

const healthRoutes = Router();

healthRoutes.get("/", (req, res) => {
  return res.json({
    status: "ok",
  });
});

export { healthRoutes };