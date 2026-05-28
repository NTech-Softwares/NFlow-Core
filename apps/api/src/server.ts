import "dotenv/config";
import { app } from "./app";
import { startWhatsapp } from "../../../providers/whatsapp/baileys/client";
import { startWorker } from "../../worker/src/server";

const PORT = 3333;

async function bootstrap() {
  await startWhatsapp();
  startWorker();

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 API running on port 0.0.0.0:${PORT}`);
  });
}

bootstrap();
