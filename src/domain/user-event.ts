import type { UserDocument } from "./user-document";

/** Evento de dominio ya interpretado, independiente del formato de Kafka. */
export type UserEvent =
  | { kind: "upsert"; user: UserDocument }
  | { kind: "delete"; id: string };
