import { Kafka, logLevel, type Consumer } from "kafkajs";
import type { IndexUserEventUseCase } from "../../application/use-cases/index-user-event";

export interface KafkaConfig {
  brokers: string[];
  clientId: string;
  groupId: string;
  topic: string;
  ssl: boolean | { ca: string[] };
  sasl?: { mechanism: "scram-sha-256"; username: string; password: string };
}

/**
 * Consumidor del tópico de usuarios. Usa su propio groupId para no
 * interferir con el Notification Service.
 */
export class UserEventsConsumer {
  private readonly consumer: Consumer;

  constructor(
    private readonly config: KafkaConfig,
    private readonly indexEvent: IndexUserEventUseCase,
  ) {
    const kafka = new Kafka({
      clientId: config.clientId,
      brokers: config.brokers,
      ssl: config.ssl,
      sasl: config.sasl,
      logLevel: logLevel.INFO,
    });
    this.consumer = kafka.consumer({ groupId: config.groupId });
  }

  async start(): Promise<void> {
    await this.consumer.connect();
    await this.consumer.subscribe({ topic: this.config.topic, fromBeginning: true });

    await this.consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        const value = message.value?.toString();
        if (!value) return;

        let raw: unknown;
        try {
          raw = JSON.parse(value);
        } catch {
          // Mensaje mal formado: se registra y se omite para no bloquear la partición.
          console.warn(`[search] JSON inválido en ${topic}[${partition}]@${message.offset}, omitido`);
          return;
        }

        // Si OpenSearch falla, el error se propaga y kafkajs reintenta el mensaje.
        const result = await this.indexEvent.execute(raw);
        if (result === "ignored") {
          console.debug(`[search] evento no relevante en ${topic}[${partition}]@${message.offset}`);
        }
      },
    });
  }

  async stop(): Promise<void> {
    await this.consumer.disconnect();
  }
}
