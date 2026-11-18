import { Client } from "@opensearch-project/opensearch";
import type { UserDocument } from "../../domain/user-document";
import type { UserIndexPort, UserSearchCriteria } from "../../application/ports/user-index.port";

export interface OpenSearchConfig {
  url: string;
  index: string;
}

/**
 * Adaptador de OpenSearch (Aiven). Índice con 1 shard y 0 réplicas,
 * porque el plan free es de un solo nodo.
 */
export class OpenSearchUserIndexAdapter implements UserIndexPort {
  private readonly client: Client;

  constructor(private readonly config: OpenSearchConfig) {
    this.client = new Client({ node: config.url });
  }

  async ensureIndex(): Promise<void> {
    const exists = await this.client.indices.exists({ index: this.config.index });
    if (exists.body) return;

    await this.client.indices.create({
      index: this.config.index,
      body: {
        settings: { number_of_shards: 1, number_of_replicas: 0 },
        mappings: {
          properties: {
            id: { type: "keyword" },
            name: { type: "text" },
            email: { type: "keyword" },
            role: { type: "keyword" },
            status: { type: "keyword" },
          },
        },
      },
    });
  }

  async upsert(user: UserDocument): Promise<void> {
    await this.client.index({
      index: this.config.index,
      id: user.id,
      body: user,
    });
  }

  async remove(id: string): Promise<void> {
    try {
      await this.client.delete({ index: this.config.index, id });
    } catch (error) {
      if (!isNotFound(error)) throw error;
    }
  }

  async search(criteria: UserSearchCriteria): Promise<UserDocument[]> {
    const must = criteria.q
      ? [{ match: { name: { query: criteria.q, fuzziness: "AUTO" } } }]
      : [{ match_all: {} }];
    const filter = criteria.status ? [{ term: { status: criteria.status } }] : [];

    const response = await this.client.search({
      index: this.config.index,
      body: {
        size: criteria.limit,
        query: { bool: { must, filter } },
      },
    });

    return response.body.hits.hits.map((hit) => hit._source as UserDocument);
  }
}

function isNotFound(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { statusCode?: number }).statusCode === 404;
}
