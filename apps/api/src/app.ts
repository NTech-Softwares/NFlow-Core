import express from "express";
import cors from "cors";
import { statusRoutes } from "../../../modules/status/routes/status.routes";
import whatsappRoutes from "./routes/whatsapp.routes";
import flowsRoutes from "./routes/flows.routes";
import path from "path";
import authRoutes from "../../../modules/auth/auth.routes";

const app = express();

app.use(
  cors({
    origin: "*",
  }),
);
app.use((req, res, next) => {
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; connect-src 'self' http://localhost:3000 https://api.qrserver.com; img-src 'self' data: https://api.qrserver.com; script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;",
  );
  next();
});
app.use(express.json());

app.use("/auth", authRoutes);
app.use("/whatsapp", whatsappRoutes);
app.use("/flows", flowsRoutes);
app.use("/status", statusRoutes);

export { app };
