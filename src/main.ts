import express from "express";
import { loadConfig } from "./config/env";
import { IndexUserEventUseCase } from "./application/use-cases/index-user-event";
import { SearchUsersUseCase } from "./application/use-cases/search-users";
import { OpenSearchUserIndexAdapter } from "./infrastructure/opensearch/opensearch-user-index.adapter";
import { UserEventsConsumer } from "./infrastructure/kafka/user-events.consumer";
import { createSearchRouter } from "./infrastructure/http/search.routes";

async function main(): Promise<void> {
  const config = loadConfig();

  // Composición: se crea el adaptador y se inyecta en los casos de uso.
  const index = new OpenSearchUserIndexAdapter(config.opensearch);
  await index.ensureIndex();

  const consumer = new UserEventsConsumer(config.kafka, new IndexUserEventUseCase(index));
  await consumer.start();

  const app = express();
  app.use(express.json());
  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });
  app.use(createSearchRouter(new SearchUsersUseCase(index)));

  const server = app.listen(config.port, () => {
    console.log(`[search] escuchando en el puerto ${config.port}`);
  });

  const shutdown = async (signal: string) => {
    console.log(`[search] ${signal} recibido, cerrando`);
    server.close();
    await consumer.stop();
    process.exit(0);
  };
  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

main().catch((error) => {
  console.error("[search] no se pudo iniciar", error);
  process.exit(1);
});
