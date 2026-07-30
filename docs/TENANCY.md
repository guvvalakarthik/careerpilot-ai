# Tenant isolation and authorization evidence

## Policy

Every domain query must establish these facts in order:

1. The request has an authenticated user.
2. The supplied workspace exists for that user through a membership record.
3. The membership role permits the operation.
4. A seeker-owned record has `ownerId === session.user.id`.
5. Linked records belong to the same workspace and owner before a relationship is created.

`OWNER` and `COACH` can manage records across a workspace. `SEEKER` can only manage their own records. Only owners can grant privileged roles, change workspace ownership, or remove members with ownership implications.

## Enforcement locations

| Concern | Implementation |
|---|---|
| Authentication | `protectedProcedure` in `src/server/api/trpc.ts` |
| Workspace membership | `workspaceProcedure` in `src/server/api/trpc.ts` |
| Role gates | `requireRole` in `src/server/api/trpc.ts` |
| Owner filters | `ownerScope` and `ownedApplicationScope` in `src/server/api/ownership.ts` |
| Delegated ownership | `resolveRecordOwner` membership validation |
| Upload authorization | `src/server/document-upload.ts` and upload route membership checks |
| RAG reload | Workspace/owner-scoped queries in `src/server/rag/indexing.ts` |

## Integration evidence

`src/server/api/__tests__/tenant-rbac.integration.test.ts` runs against PostgreSQL and proves:

- seekers list only their records while coaches see workspace records;
- guessed peer and cross-tenant IDs return not found;
- outsiders cannot query a workspace and a coach cannot use another tenant ID;
- seekers cannot mutate peer-owned applications;
- delegated owners must be members of the current workspace;
- linked records with different owners are rejected;
- coaches cannot grant privileged roles; and
- the last owner cannot be removed or demoted.

The pgvector integration suite separately verifies workspace and owner filtering for semantic retrieval.

## Database RLS decision

PostgreSQL row-level security is not enabled. Prisma uses pooled application connections, so introducing request-specific database roles without a transaction-bound session context would create a false sense of isolation. The current boundary is explicit, testable application policy plus compound workspace keys for RAG chunks.

RLS remains a defense-in-depth roadmap item. Before enabling it, the team must establish transaction-local user/workspace context, policies for every tenant table, migration tests, service-role exceptions for jobs, and pooler compatibility. See [ADR 0001](adr/0001-application-tenant-isolation.md).

## Review checklist

- [ ] New tenant models carry `workspaceId` and an index beginning with it.
- [ ] Routers use `workspaceProcedure` or a stricter role procedure.
- [ ] Record lookups include workspace and owner scope in the database query.
- [ ] Cross-record links validate workspace and owner compatibility.
- [ ] Identifier-only job events reload records under the same scope.
- [ ] Integration tests include an outsider, a peer seeker, and an elevated member.
- [ ] Responses do not reveal whether an unauthorized foreign ID exists.
