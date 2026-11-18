import type { UserDocument } from "../../domain/user-document";
import type { UserIndexPort, UserSearchCriteria } from "../ports/user-index.port";

/** Lectura: todas las búsquedas salen solo de OpenSearch (CQRS). */
export class SearchUsersUseCase {
  constructor(private readonly index: UserIndexPort) {}

  execute(criteria: UserSearchCriteria): Promise<UserDocument[]> {
    return this.index.search(criteria);
  }
}
