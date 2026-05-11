import express from "express";
import cors from "cors";

import { statusRoutes } from "../../../modules/status/routes/status.routes";
import messageRoutes from './routes/message.routes'
import dashboardRoutes from "./routes/dashboard.routes";

const app = express();

app.use(cors());
app.use(express.json());

app.use('/whatsapp', messageRoutes)
app.use('/dashboard', dashboardRoutes)
app.use("/status", statusRoutes);

export { app };
