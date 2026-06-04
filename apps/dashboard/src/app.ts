import express from "express";
import path from "path";
import mainRoutes from "./routes/main.routes";
import cors from "cors";

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.resolve(__dirname, "public")));

app.use("/uploads", express.static("uploads"));

app.use("/", mainRoutes);

export { app };
