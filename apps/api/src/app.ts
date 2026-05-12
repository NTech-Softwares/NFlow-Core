import express from "express";
import cors from "cors";

import { statusRoutes } from "../../../modules/status/routes/status.routes";
import whatsappRoutes from "./routes/whatsapp.routes";
import dashboardRoutes from "./routes/dashboard.routes";
import path from "path";

const app = express();

app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, "public")));

app.use("/uploads", express.static("uploads"));

app.use("/whatsapp", whatsappRoutes);
app.use("/dashboard", dashboardRoutes);
app.use("/status", statusRoutes);

export { app };
