import express from "express";
import path from "path";
import dashboardRoutes from "./routes/dashboard.routes";
import cors from "cors";

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.resolve(__dirname, "public")));

app.use("/uploads", express.static("uploads"));

app.use("/", dashboardRoutes);

export { app };
