# RAG vector foundation

CareerPilot stores retrieval embeddings alongside application data in PostgreSQL through pgvector. This foundation is intentionally feature-gated: it defines safe storage and embedding boundaries, but does not index production data or alter Assistant Chat yet.

## Data model

`KnowledgeSource` represents one versioned source in a workspace:

- uploaded document;
- candidate profile;
- job opportunity.

Each source carries `workspaceId`, `ownerId`, its source record ID, a content hash, indexing status, embedding model/dimensions, and an index version. `KnowledgeChunk` repeats `workspaceId`; a composite foreign key requires it to match the source workspace. This gives retrieval queries a direct tenant key without trusting JSON metadata.

Chunks store bounded text, a SHA-256 content hash, estimated token count, metadata, and a required `vector(768)`. A cosine HNSW index accelerates nearest-neighbor ordering. Prisma 6 represents the vector as `Unsupported("vector(768)")`, so vector writes and reads use parameterized raw SQL and never return the unsupported column directly.

## Embedding contract

The provider uses `gemini-embedding-001` with:

- `RETRIEVAL_DOCUMENT` for indexed chunks;
- `RETRIEVAL_QUERY` for search input;
- `outputDimensionality: 768`;
- explicit L2 normalization before storage or search.

The source row stores model, dimensions, and index version because embedding spaces from different models are not interchangeable. A model change requires a full re-index rather than mixing vectors.

Input is normalized and split into deterministic chunks of at most 6,000 characters with a 600-character overlap. Every SDK response must contain exactly one finite, non-zero 768-dimensional vector per input.

## Retrieval boundary

The repository requires a workspace scope on every query. Seekers additionally filter by `ownerId`; privileged workspace roles may search all owners only after the API layer has verified their membership and role. Results expose source/chunk IDs, text, metadata, and cosine similarity, never the raw vector.

## Rollout state

`RAG_ENABLED=false` is the default. The pgvector migration has been applied only to local Docker and isolated CI during this branch. It must not be applied to the configured Neon production database without the separate migration approval described in [Database migration safety](DATABASE_MIGRATIONS.md).

The next implementation layer is durable Inngest indexing with idempotent source replacement, retries, deletion handling, and backfill. Assistant retrieval and citations come afterward.

References:

- [Gemini embeddings](https://ai.google.dev/gemini-api/docs/embeddings)
- [pgvector](https://github.com/pgvector/pgvector)
- [Prisma PostgreSQL extensions](https://www.prisma.io/docs/orm/v6/prisma-schema/postgresql-extensions)
