import type { UserDocument, UserStatus } from "../../domain/user-document";

export interface UserSearchCriteria {
  q?: string;
  status?: UserStatus;
  limit: number;
}

/** Puerto de salida: el caso de uso no sabe que existe OpenSearch. */
export interface UserIndexPort {
  ensureIndex(): Promise<void>;
  /** Idempotente: usar el id de negocio como _id evita duplicados al reprocesar. */
  upsert(user: UserDocument): Promise<void>;
  /** Idempotente: borrar un id inexistente no es error. */
  remove(id: string): Promise<void>;
  search(criteria: UserSearchCriteria): Promise<UserDocument[]>;
}
