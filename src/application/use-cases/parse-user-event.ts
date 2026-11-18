import type { UserDocument } from "../../domain/user-document";
import type { UserEvent } from "../../domain/user-event";

/**
 * Interpreta un mensaje de Kafka. Soporta:
 *  - Formato real de users-management (PROYECTO.md 2.2.0):
 *      { "eventName": "user.created", "occurredOn": "...", "payload": { id, name, email, role, status } }
 *  - Formato alternativo del documento de contexto:
 *      { "type": "USER_CREATED", "data": { ... } }
 *
 * Devuelve null para eventos que no son de usuario o que no tienen forma válida.
 */
export function parseUserEvent(raw: unknown): UserEvent | null {
  if (!isRecord(raw)) return null;

  const name = normalizeEventName(raw.eventName ?? raw.type);
  const body = raw.payload ?? raw.data;
  if (!name || !isRecord(body) || typeof body.id !== "string" || body.id.length === 0) {
    return null;
  }

  switch (name) {
    case "user.created":
    case "user.updated":
      return { kind: "upsert", user: toUserDocument(body) };
    case "user.deleted":
      return { kind: "delete", id: body.id };
    default:
      return null;
  }
}

/** "USER_CREATED" -> "user.created"; "user.created" se deja igual. */
function normalizeEventName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return value.trim().toLowerCase().replace(/_/g, ".");
}

/**
 * Lista blanca de campos: aunque el emisor mande más datos (por ejemplo un hash),
 * solo se copian los necesarios para buscar.
 */
function toUserDocument(body: Record<string, unknown>): UserDocument {
  return {
    id: String(body.id),
    name: asString(body.name),
    email: asString(body.email),
    role: asString(body.role),
    status: asString(body.status),
  };
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
