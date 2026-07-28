# Database migration safety

CareerPilot separates local migration development, CI validation, and production deployment. Local commands fail closed when their selected PostgreSQL hostname is not loopback.

## Local development

Start PostgreSQL and use the guarded scripts:

```powershell
npm run db:up
npm run db:migrate
npm run db:status:local
npm run db:drift:local
```

The wrapper loads `.env`, selects `LOCAL_DATABASE_URL` before `DATABASE_URL`, and accepts only `localhost`, `127.0.0.0/8`, or `::1`. It passes the verified URL to Prisma explicitly. Credentials and query parameters are omitted from its target log.

Use `LOCAL_DATABASE_URL` when the application itself must connect to another database. Never set it to a shared, preview, staging, or production host.

## Pull-request validation

GitHub Actions provisions an isolated PostgreSQL 16 service and:

1. validates `schema.prisma`;
2. applies every committed migration with `migrate deploy`;
3. verifies the `_prisma_migrations` history with `migrate status`;
4. compares the resulting database schema with `schema.prisma`;
5. runs integration and browser tests.

The same loopback guard used by developers is active in CI.

## Production release gate

Production migrations are not run automatically by this repository. A production migration requires a separate approval and a controlled CI/CD release environment. Do not keep a production `DATABASE_URL` in a developer `.env` file and do not run `prisma migrate deploy` locally against production.

Before approval:

1. Review every new `migration.sql`, including locks, table rewrites, backfills, destructive statements, and expected duration.
2. Prefer expand-and-contract changes so the old and new application versions can run during deployment.
3. Confirm a recent backup or point-in-time recovery window and record the recovery owner.
4. Apply and validate the migration against an isolated preview database with production-like data volume.
5. Run `prisma migrate status` read-only against production and resolve any failed, missing, or divergent history before deployment.

During the approved release:

1. Run exactly one `prisma migrate deploy` job with an environment-protected production secret.
2. Keep Prisma advisory locking enabled.
3. Run `prisma migrate status`, application smoke tests, and error/latency monitoring immediately afterward.

Prisma migrations do not provide automatic down migrations. Recover by stopping the rollout when necessary, restoring from the approved recovery point for catastrophic failure, or shipping a reviewed forward-fix migration.

References:

- [Prisma development and production workflows](https://www.prisma.io/docs/orm/prisma-migrate/workflows/development-and-production)
- [Prisma migrate status](https://www.prisma.io/docs/cli/migrate/status)
- [Deploying database changes with Prisma Migrate](https://www.prisma.io/docs/orm/prisma-client/deployment/deploy-database-changes-with-prisma-migrate)
