import type { UserIndexPort } from "../ports/user-index.port";
import { parseUserEvent } from "./parse-user-event";

export type IndexUserEventResult = "upserted" | "deleted" | "ignored";

/** Proyección: aplica un evento de usuario al índice de búsqueda. */
export class IndexUserEventUseCase {
  constructor(private readonly index: UserIndexPort) {}

  async execute(raw: unknown): Promise<IndexUserEventResult> {
    const event = parseUserEvent(raw);
    if (!event) return "ignored";

    if (event.kind === "upsert") {
      await this.index.upsert(event.user);
      return "upserted";
    }

    await this.index.remove(event.id);
    return "deleted";
  }
}
