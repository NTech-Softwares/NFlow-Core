import express from "express";
import cors from "cors";

import { healthRoutes } from "../../../modules/health/routes/health.routes";
import { statusRoutes } from "../../../modules/status/routes/status.routes";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/health", healthRoutes);
app.use("/status", statusRoutes);

export { app };