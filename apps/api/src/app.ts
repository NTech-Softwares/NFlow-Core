import express from "express";
import cors from "cors";
import { statusRoutes } from "../../../modules/status/routes/status.routes";
import whatsappRoutes from "./routes/whatsapp.routes";
import flowsRoutes from "./routes/flows.routes";
import path from "path";
import authRoutes from "../../../modules/auth/auth.routes";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/auth", authRoutes);
app.use("/whatsapp", whatsappRoutes);
app.use("/flows", flowsRoutes);
app.use("/status", statusRoutes);

export { app };
