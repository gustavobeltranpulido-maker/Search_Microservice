import type { KafkaConfig } from "../infrastructure/kafka/user-events.consumer";
import type { OpenSearchConfig } from "../infrastructure/opensearch/opensearch-user-index.adapter";

export interface AppConfig {
  port: number;
  opensearch: OpenSearchConfig;
  kafka: KafkaConfig;
}

/** Lee y valida variables de entorno. Falla al arrancar si falta algo obligatorio. */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const brokers = required(env, "KAFKA_BROKERS")
    .split(",")
    .map((b) => b.trim())
    .filter(Boolean);

  const protocol = (env.KAFKA_SECURITY_PROTOCOL ?? "SASL_SSL").toUpperCase();
  const useSsl = protocol === "SSL" || protocol === "SASL_SSL";
  const caCert = env.KAFKA_CA_CERT?.replace(/\\n/g, "\n");

  return {
    port: Number(env.PORT ?? 3003),
    opensearch: {
      url: required(env, "OPENSEARCH_URL"),
      index: env.OPENSEARCH_INDEX ?? "users",
    },
    kafka: {
      brokers,
      clientId: env.KAFKA_CLIENT_ID ?? "search-service",
      groupId: env.KAFKA_GROUP_ID ?? "search-service",
      topic: env.KAFKA_TOPIC_USER_EVENTS ?? "users.events",
      ssl: useSsl ? (caCert ? { ca: [caCert] } : true) : false,
      sasl: protocol.startsWith("SASL")
        ? {
            mechanism: "scram-sha-256",
            username: required(env, "KAFKA_USERNAME"),
            password: required(env, "KAFKA_PASSWORD"),
          }
        : undefined,
    },
  };
}

function required(env: NodeJS.ProcessEnv, name: string): string {
  const value = env[name];
  if (!value) throw new Error(`Falta la variable de entorno obligatoria ${name}`);
  return value;
}
