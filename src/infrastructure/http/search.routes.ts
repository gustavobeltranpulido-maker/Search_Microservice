import { Router, type Request, type Response } from "express";
import { USER_STATUSES, type UserStatus } from "../../domain/user-document";
import type { SearchUsersUseCase } from "../../application/use-cases/search-users";

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 20;
const MAX_QUERY_LENGTH = 100;

export function createSearchRouter(searchUsers: SearchUsersUseCase): Router {
  const router = Router();

  // GET /search/users?q=juan&status=ACTIVE&limit=20
  router.get("/search/users", async (req: Request, res: Response) => {
    const parsed = parseQuery(req.query);
    if ("error" in parsed) {
      res.status(400).json({ error: parsed.error });
      return;
    }

    try {
      const users = await searchUsers.execute(parsed.criteria);
      res.json({ total: users.length, results: users });
    } catch (error) {
      console.error("[search] fallo al consultar OpenSearch", error);
      res.status(503).json({ error: "El servicio de búsqueda no está disponible" });
    }
  });

  return router;
}

type ParseResult =
  | { criteria: { q?: string; status?: UserStatus; limit: number } }
  | { error: string };

function parseQuery(query: Request["query"]): ParseResult {
  const q = readSingle(query.q);
  if (q !== undefined && q.length > MAX_QUERY_LENGTH) {
    return { error: `q no puede superar ${MAX_QUERY_LENGTH} caracteres` };
  }

  const statusRaw = readSingle(query.status);
  let status: UserStatus | undefined;
  if (statusRaw !== undefined) {
    const upper = statusRaw.toUpperCase();
    if (!(USER_STATUSES as readonly string[]).includes(upper)) {
      return { error: `status debe ser uno de: ${USER_STATUSES.join(", ")}` };
    }
    status = upper as UserStatus;
  }

  const limitRaw = readSingle(query.limit);
  let limit = DEFAULT_LIMIT;
  if (limitRaw !== undefined) {
    limit = Number(limitRaw);
    if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
      return { error: `limit debe ser un entero entre 1 y ${MAX_LIMIT}` };
    }
  }

  return { criteria: { q: q?.trim() || undefined, status, limit } };
}

/** Express puede entregar un parámetro repetido como array; se toma el primero y se valida. */
function readSingle(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return undefined;
}
