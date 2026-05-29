import "dotenv/config";
import { app } from "./app";
import { startWorker } from "../../worker/src/server";
import { WhatsappService } from "./services/whatsapp.service";
import { logger } from "../../../shared/utils/logger";

const PORT = 3333;
const whatsappService = new WhatsappService();

async function bootstrap() {
  // 🔄 Inicializa o motor do Worker de background
  startWorker();

  // 🚀 Dá o boot assíncrono em todas as conexões ativas do Baileys salvas no banco JSON
  await whatsappService.initAllSavedSessions();

  app.listen(PORT, "0.0.0.0", () => {
    logger.info(`🚀 API running on port 0.0.0.0:${PORT} (Multi-Tenant Mode)`);
  });
}

bootstrap();
