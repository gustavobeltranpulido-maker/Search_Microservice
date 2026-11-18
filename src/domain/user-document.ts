// Dominio puro: sin SDKs de OpenSearch, Kafka ni Express.

export const USER_STATUSES = ["ACTIVE", "INACTIVE", "PENDING", "BLOCKED"] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

/**
 * Documento indexado. Solo contiene campos seguros para búsqueda.
 * La contraseña (o su hash) NUNCA entra aquí.
 */
export interface UserDocument {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
}
