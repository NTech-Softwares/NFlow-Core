import express from "express";
import cors from "cors";

import { healthRoutes } from "../../../modules/health/routes/health.routes";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/health", healthRoutes);

export { app };