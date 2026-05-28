import "dotenv/config";
import { app } from "./app";

const PORT = 3000;

async function bootstrap() {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Dashboard running on port ${PORT}`);
  });
}

bootstrap();
