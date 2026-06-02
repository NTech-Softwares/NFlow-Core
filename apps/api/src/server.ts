import "dotenv/config";
import { app } from "./app";
import { startWorker } from "../../worker/src/server";
import { whatsappService } from "./services/whatsapp.service";
import { logger } from "../../../shared/utils/logger";
import { startScheduleWorker } from "../../../modules/scheduler/schedule.worker";

const PORT = 3333;

async function bootstrap() {
  // 🔄 Liga o agendador em background na inicialização do servidor
  startScheduleWorker();
  // 🔄 Inicializa o motor do Worker de background
  startWorker();

  // 🚀 Dá o boot assíncrono em todas as conexões ativas do Baileys salvas no banco JSON
  await whatsappService.initAllSavedSessions();

  app.listen(PORT, "0.0.0.0", () => {
    logger.info(`🚀 API running on port 0.0.0.0:${PORT} (Multi-Tenant Mode)`);
  });
}

bootstrap();
